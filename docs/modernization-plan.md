# Modernization Plan

1. **Config as a First-Class Dependency**
   - Cache environment parsing and expose the resulting `AppConfig` through DI so modules read configuration without repeatedly invoking `loadConfig`.
   - Provide dedicated adapters (e.g., checkout link provider) that depend on the config instead of letting domain models talk to environment state directly.

2. **Checkout Link Provider Abstraction**
   - Introduce a `CheckoutLinkProvider` implementation that encapsulates URL composition, TTL handling, and future instrumentation hooks.
   - Pass the provider into use cases via DI to decouple the domain model from infrastructure concerns.

3. **Use-Case Refinements**
   - Update payment use cases to rely on the provider rather than the static helper on `Payment`, making them easier to test and extend.
   - Improve unit tests to assert the new behavior and prevent regressions.

4. **Stricter Types & Utilities**
   - Extend `AppConfig` schema with a configurable checkout link TTL, ensuring consistent behavior between environments and eliminating magic numbers scattered through the codebase.

These steps keep the app aligned with modern service design practices (explicit dependencies, pure domain models, infrastructure boundaries) while remaining incremental enough to land quickly.
