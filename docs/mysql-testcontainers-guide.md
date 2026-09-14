# MySQL Testcontainers 통합 테스트 가이드

이 문서는 Spring Boot / Java 프로젝트에서 실제 MySQL 엔진을 사용해 Repository, Mapper, API를 검증하는 방법을 설명한다.

## 언제 사용하는가

다음은 H2나 mock이 아니라 MySQL Testcontainers로 검증한다.

- MyBatis / JPA 쿼리의 문법과 결과
- `LIMIT` / `OFFSET` 기반 페이지네이션
- `NOT EXISTS`, 조인, `COUNT(DISTINCT ...)`
- MySQL 정렬, NULL, 문자열 비교 차이
- DB 마이그레이션 이후의 실제 API 응답

H2는 서비스 로직의 빠른 테스트에는 유용하지만, MySQL 호환 모드도 모든 차이를 재현하지 않는다. SQL 결과가 인수 기준인 경우 H2 통과만으로 완료 판정하지 않는다.

## 전제 조건

- Docker Desktop 또는 Docker Engine 실행
- JDK와 Gradle 또는 Maven
- 테스트 전용 MySQL 계정·데이터만 사용. 운영·공유 개발 DB는 테스트 대상으로 사용하지 않는다.

## Gradle 설정

버전은 프로젝트가 사용하는 Spring Boot / Testcontainers 조합에 맞게 고정한다.

```kotlin
dependencies {
    testImplementation(platform("org.testcontainers:testcontainers-bom:2.0.5"))
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-mysql")
    testRuntimeOnly("com.mysql:mysql-connector-j")
}
```

## Maven 설정

```xml
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>testcontainers-mysql</artifactId>
  <version>2.0.5</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>com.mysql</groupId>
  <artifactId>mysql-connector-j</artifactId>
  <scope>test</scope>
</dependency>
```

JUnit 5를 사용할 경우 `org.testcontainers:junit-jupiter`도 test scope로 추가한다.

## Spring Boot 3.1 이상 예시

`@ServiceConnection`을 사용하면 Spring Boot가 컨테이너의 JDBC 연결 정보를 자동으로 적용한다.

```java
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
class OrderQueryRepositoryIntegrationTest {

    @Container
    @ServiceConnection
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0.36")
        .withDatabaseName("orders_test")
        .withUsername("test")
        .withPassword("test");

    @Test
    void b2c_order_page_matches_its_count() {
        // fixture 입력 → repository 호출 → 목록/건수/필터 결과 검증
    }
}
```

프로젝트가 Spring Boot 3.1 미만이거나 연결 속성을 직접 제어해야 한다면 `@DynamicPropertySource`로 URL, 사용자, 비밀번호를 등록한다.

```java
@DynamicPropertySource
static void mysqlProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", mysql::getJdbcUrl);
    registry.add("spring.datasource.username", mysql::getUsername);
    registry.add("spring.datasource.password", mysql::getPassword);
}
```

## Fixture와 검증 방식

테스트마다 필요한 최소 데이터만 넣는다. 주문 목록이라면 다음 조합을 최소 fixture로 둔다.

- B2C / B2B 주문
- 재고 있음 / 품절 주문
- 첫 페이지, 중간 페이지, 마지막 페이지 경계
- 각 검색·상태 필터 조합
- 조인으로 중복될 수 있는 주문

각 테스트는 한 가지 규칙을 명확히 확인한다.

```text
목록 결과의 행 수 == count 쿼리 결과
offset / limit == 기대 페이지 데이터
품절 제외 == 기대 주문만 반환
필터별 응답 == fixture가 정의한 결과
```

가능하면 기존 구현과 새 구현을 같은 fixture에서 실행해 결과 ID 목록과 count를 비교한다. SQL 로그는 보조 근거이며, 테스트의 주된 assert는 반환 데이터여야 한다.

## 스키마와 마이그레이션

테스트 컨테이너에는 운영과 같은 Flyway / Liquibase 마이그레이션을 적용한다. 테스트용 `schema.sql`을 따로 유지하면 운영 스키마와 드리프트할 위험이 있다.

마이그레이션이 느리면 다음 순서로 최적화한다.

1. 테스트 클래스 단위로 컨테이너를 재사용한다.
2. fixture는 트랜잭션 롤백 또는 명시적 정리로 격리한다.
3. 정말 느린 API E2E만 별도 integration-test task로 분리한다.

## CI 운영

- PR CI에서 Docker가 가능한 runner로 integration test를 실행한다.
- 빠른 단위 테스트와 MySQL 통합 테스트 task를 분리한다.
- Docker를 쓸 수 없는 개발자 환경에서는 통합 테스트를 skip할 수 있게 하되, PR 병합 조건에서는 실행한다.
- 이미지 태그와 Testcontainers 버전을 고정해 재현성을 유지한다.

예시:

```bash
./gradlew test
./gradlew integrationTest
```

## Telos 완료 판정에 연결하기

`project.yml`에는 통합 테스트 task를 검증 명령으로 등록한다.

```yaml
modules:
  - name: order-api
    paths: ["src/main/java/**", "src/test/java/**"]
    verify:
      - ./gradlew integrationTest --tests "*OrderQueryRepositoryIntegrationTest"
```

이 테스트가 CI와 로컬 Docker 환경에서 통과하면 SQL 결과 동일성 관련 AC에 실제 실행 근거를 기록할 수 있다. Docker가 없는 환경에서 실행하지 못했다면 Telos 상태는 `uncertain`으로 남기고, `approved`로 바꾸지 않는다.

## 공식 참고 자료

- [Spring Boot Testcontainers](https://docs.spring.io/spring-boot/reference/testing/testcontainers.html)
- [Testcontainers MySQL Module](https://java.testcontainers.org/modules/databases/mysql/)
- [H2 Compatibility Modes](https://h2database.github.io/html/features.html)
