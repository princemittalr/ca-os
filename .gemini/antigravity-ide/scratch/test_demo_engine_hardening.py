import sys
import os

# Add backend directory to sys.path
backend_path = r"c:\Users\princ\Documents\RECKON AI\backend"
sys.path.insert(0, backend_path)

from config.settings import settings

# Save current settings to restore later
orig_env = settings.ENV
orig_demo_mode = settings.ENABLE_DEMO_MODE

try:
    print("--- 1. Testing Default FEATURE_FLAGS ---")
    from services.demo_engine import FEATURE_FLAGS, record_demo_analytic, DEMO_ANALYTICS_LOGS, reset_demo_workspace, get_seeded_clients
    
    print(f"FEATURE_FLAGS: {FEATURE_FLAGS}")
    assert FEATURE_FLAGS["MOCK_MODE_ENABLED"] is False, "MOCK_MODE_ENABLED should default to False!"
    print("OK: Default MOCK_MODE_ENABLED is False.")

    print("\n--- 2. Testing FEATURE_FLAGS modification rules ---")
    # In development with demo mode enabled, we should be able to mutate
    settings.ENV = "development"
    settings.ENABLE_DEMO_MODE = True
    FEATURE_FLAGS["MOCK_MODE_ENABLED"] = True
    assert FEATURE_FLAGS["MOCK_MODE_ENABLED"] is True, "Should allow mutation in dev with demo mode!"
    print("OK: Mutation allowed in dev/demo mode.")

    # In production, we should NOT be able to mutate
    settings.ENV = "production"
    try:
        FEATURE_FLAGS["MOCK_MODE_ENABLED"] = False
        raise AssertionError("Mutation should have raised RuntimeError in production!")
    except RuntimeError as e:
        print(f"OK: Mutation correctly raised: {e}")

    # In dev but with demo mode disabled, we should NOT be able to mutate
    settings.ENV = "development"
    settings.ENABLE_DEMO_MODE = False
    try:
        FEATURE_FLAGS["MOCK_MODE_ENABLED"] = False
        raise AssertionError("Mutation should have raised RuntimeError when demo mode is disabled!")
    except RuntimeError as e:
        print(f"OK: Mutation correctly raised: {e}")

    print("\n--- 3. Testing record_demo_analytic guard & cap ---")
    settings.ENV = "production"
    settings.ENABLE_DEMO_MODE = False
    
    # In production, it should return silently
    initial_len = len(DEMO_ANALYTICS_LOGS)
    record_demo_analytic("test_event_prod")
    assert len(DEMO_ANALYTICS_LOGS) == initial_len, "Analytics should not be recorded in production!"
    print("OK: Silent no-op in production verified.")

    # In development, it should record and cap at 500
    settings.ENV = "development"
    settings.ENABLE_DEMO_MODE = True
    
    DEMO_ANALYTICS_LOGS.clear()
    for i in range(600):
        record_demo_analytic(f"event_{i}")
    
    assert len(DEMO_ANALYTICS_LOGS) == 500, f"Expected 500 events, got {len(DEMO_ANALYTICS_LOGS)}"
    assert DEMO_ANALYTICS_LOGS[0]["event_name"] == "event_100", f"Expected oldest event to be event_100, got {DEMO_ANALYTICS_LOGS[0]['event_name']}"
    assert DEMO_ANALYTICS_LOGS[-1]["event_name"] == "event_599", f"Expected latest event to be event_599, got {DEMO_ANALYTICS_LOGS[-1]['event_name']}"
    print("OK: Capping at 500 entries verified successfully.")

    print("\n--- 4. Testing reset_demo_workspace guards ---")
    # Production check
    settings.ENV = "production"
    settings.ENABLE_DEMO_MODE = True
    try:
        reset_demo_workspace()
        raise AssertionError("reset_demo_workspace should fail in production!")
    except RuntimeError as e:
        assert str(e) == "Demo reset is disabled in production."
        print(f"OK: Production guard raised correct message: {e}")

    # Demo mode disabled check
    settings.ENV = "development"
    settings.ENABLE_DEMO_MODE = False
    try:
        reset_demo_workspace()
        raise AssertionError("reset_demo_workspace should fail when ENABLE_DEMO_MODE is False!")
    except RuntimeError as e:
        assert str(e) == "ENABLE_DEMO_MODE is not set."
        print(f"OK: Demo mode guard raised correct message: {e}")

    # Dev/demo mode check with Supabase inactive
    settings.ENV = "development"
    settings.ENABLE_DEMO_MODE = True
    
    # We should run reset_demo_workspace successfully (it will fall back to local mock cache check if Supabase is inactive)
    res = reset_demo_workspace()
    assert res is True, "reset_demo_workspace should return True"
    print("OK: reset_demo_workspace executed successfully in development mode.")

    print("\n--- 5. Testing get_seeded_clients still returns 4 clients ---")
    clients = get_seeded_clients()
    assert len(clients) == 4, f"Expected 4 clients, got {len(clients)}"
    print("OK: get_seeded_clients() returned 4 clients.")

    print("\nALL HARDENING VERIFICATION TESTS PASSED SUCCESSFULLY!")

finally:
    # Restore original settings
    settings.ENV = orig_env
    settings.ENABLE_DEMO_MODE = orig_demo_mode
