# Two-repository portability validation

Date: 2026-09-10

Telos was tested against disposable local clones of two existing repositories. The originals were read only. Each clone received only a different `.telos/project.yml` plus a temporary changed path where needed; no Telos code or skill instruction was changed between repositories.

## Repository A: BankSystemServer

- Identity: local repository `BankSystemServer`, branch `develop`, commit `58f9e3eca1a95f2d21406d7a1c71e84641d63399`
- Toolchain marker: Gradle wrapper
- `telos init` result: one `paths: ["**"]` module with `./gradlew test`
- Module selection: the new untracked `.telos/project.yml` selected the generated `all` module
- Command result: failed before tests because the isolated environment could not create the Gradle wrapper lock under the user's Gradle cache
- False-positive observation: `paths: ["**"]` intentionally selects configuration and documentation-only changes; a project that wants narrower execution must replace it with explicit module paths
- Missed-module check: changing the configuration to `paths: ["does-not-exist/**"]` returned `status: "no-op"`, `reason: "no-matching-module"`, and listed `.telos/project.yml` as the unmatched changed path

## Repository B: bw_frontend_backoffice

- Identity: local repository `bw_frontend_backoffice`, branch `feature/store_device_devicecontrol`, commit `1a1e34a486bde1b506e0957c8d720a544d30f2a2`
- Toolchain marker: `package.json` with a test script
- `telos init` result: one `paths: ["**"]` module with `npm test`
- Module selection: the new untracked `.telos/project.yml` selected the generated `all` module
- Command result: failed clearly because the disposable clone did not contain the ignored `node_modules` tree and `craco` was unavailable
- Manual-verification check: `paths: ["src/**"]`, `verify: []`, and an untracked `src/telos-validation.txt` produced the expected non-zero `manual verification is required for module all` result
- False-positive observation: the generated broad path has the same conservative documentation/configuration match as Repository A; the narrowed `src/**` pattern avoided it
- Missed-module observation: no application module was missed by `src/**` for the temporary source path

## Result

- Different toolchains were detected without changing Telos TypeScript or SKILL files.
- Changed-path matching, `no-matching-module`, command failure detail, and `verify: []` behavior were all observable and deterministic.
- Neither repository reached a passing test run in the disposable environment: one was blocked by Gradle cache permissions and the other by an intentionally absent ignored dependency directory. These are environment/toolchain failures, not reported as Telos passes.
- No Telos code or SKILL change was required while switching repositories; only `project.yml` differed.
