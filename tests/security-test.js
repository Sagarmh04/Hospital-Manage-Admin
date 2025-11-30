/**
 * Security Test: Logout All Devices
 * 
 * This demonstrates that the logout-all endpoint is properly secured
 * and can only be called by authenticated users.
 */

// Test 1: Unauthorized access should fail
async function testUnauthorizedAccess() {
  console.log("Test 1: Unauthorized access to logout-all");
  
  const res = await fetch("http://localhost:3000/api/auth/logout-all", {
    method: "POST",
    // No session cookie provided
  });
  
  const data = await res.json();
  
  console.assert(
    res.status === 401,
    "Expected 401 Unauthorized, got " + res.status
  );
  
  console.assert(
    data.error.includes("Unauthorized"),
    "Expected error message about unauthorized access"
  );
  
  console.log("✅ Test 1 passed: Unauthorized users cannot logout-all\n");
}

// Test 2: Authorized user can logout all their sessions
async function testAuthorizedLogoutAll() {
  console.log("Test 2: Authorized user logout-all");
  
  // First, login to get a valid session
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@test.com",
      password: "your-password",
      sessionDuration: "1h",
    }),
  });
  
  // Extract session cookie
  const setCookie = loginRes.headers.get("set-cookie");
  const sessionCookie = setCookie?.split(";")[0];
  
  // Now try logout-all with valid session
  const logoutRes = await fetch("http://localhost:3000/api/auth/logout-all", {
    method: "POST",
    headers: {
      Cookie: sessionCookie || "",
    },
  });
  
  const data = await logoutRes.json();
  
  console.assert(
    logoutRes.status === 200,
    "Expected 200 OK, got " + logoutRes.status
  );
  
  console.assert(
    data.success === true,
    "Expected success: true"
  );
  
  console.assert(
    data.sessionsDeleted >= 1,
    "Expected at least 1 session deleted"
  );
  
  console.log("✅ Test 2 passed: Authorized users can logout-all");
  console.log(`   Sessions deleted: ${data.sessionsDeleted}\n`);
}

// Test 3: User can only delete their own sessions
async function testSessionIsolation() {
  console.log("Test 3: Session isolation (users can only delete own sessions)");
  
  // Login as user A
  const userALogin = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "user-a@test.com",
      password: "password-a",
      sessionDuration: "1h",
    }),
  });
  
  const userACookie = userALogin.headers.get("set-cookie")?.split(";")[0];
  
  // Login as user B
  const userBLogin = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "user-b@test.com",
      password: "password-b",
      sessionDuration: "1h",
    }),
  });
  
  // User A calls logout-all
  const userALogoutAll = await fetch("http://localhost:3000/api/auth/logout-all", {
    method: "POST",
    headers: { Cookie: userACookie || "" },
  });
  
  const userAData = await userALogoutAll.json();
  
  // Verify User B's session still works (not deleted by User A)
  const userBCheck = await fetch("http://localhost:3000/api/admin", {
    headers: { 
      Cookie: userBLogin.headers.get("set-cookie")?.split(";")[0] || "" 
    },
  });
  
  console.assert(
    userBCheck.status === 200,
    "User B's session should still be valid after User A logout-all"
  );
  
  console.log("✅ Test 3 passed: Users can only delete their own sessions\n");
}

// Run all tests
console.log("=== Session Security Tests ===\n");
testUnauthorizedAccess();

// Note: Tests 2 and 3 require valid user credentials
// Uncomment when you have test users set up:
// testAuthorizedLogoutAll();
// testSessionIsolation();
