// =====================================================
// EVENT BOOKING SYSTEM - JWT PAGE AUTHENTICATION
// =====================================================


// =====================================================
// GET LOGGED-IN USER
// =====================================================

function getLoggedInUser() {

    const userData = localStorage.getItem("user");

    if (!userData) {
        return null;
    }

    try {

        return JSON.parse(userData);

    } catch (error) {

        localStorage.removeItem("user");
        localStorage.removeItem("token");

        return null;
    }
}


// =====================================================
// GET JWT TOKEN
// =====================================================

function getAuthToken() {

    return localStorage.getItem("token");
}


// =====================================================
// GET AUTHORIZATION HEADERS
// =====================================================

function getAuthHeaders() {

    const token = getAuthToken();

    if (!token) {

        return {
            "Content-Type": "application/json"
        };
    }

    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}


// =====================================================
// REQUIRE LOGIN
// =====================================================

function requireLogin() {

    const user = getLoggedInUser();
    const token = getAuthToken();

    if (!user || !token) {

        localStorage.removeItem("user");
        localStorage.removeItem("token");

        alert("Please login first.");

        window.location.href = "login.html";

        return null;
    }

    return user;
}


// =====================================================
// REQUIRE SPECIFIC ROLE
// =====================================================

function requireRole(requiredRole) {

    const user = requireLogin();

    if (!user) {
        return null;
    }

    if (user.role !== requiredRole) {

        alert(
            "Access denied. You are not allowed to access this page."
        );

        redirectToDashboard(user.role);

        return null;
    }

    return user;
}


// =====================================================
// REDIRECT BASED ON ROLE
// =====================================================

function redirectToDashboard(role) {

    if (role === "admin") {

        window.location.href =
            "admin-dashboard.html";

    } else if (role === "organiser") {

        window.location.href =
            "organiser-dashboard.html";

    } else if (role === "customer") {

        window.location.href =
            "events.html";

    } else {

        localStorage.removeItem("user");
        localStorage.removeItem("token");

        window.location.href =
            "login.html";
    }
}


// =====================================================
// HANDLE UNAUTHORIZED API RESPONSE
// =====================================================

function handleUnauthorizedResponse(response) {

    if (response.status === 401) {

        localStorage.removeItem("user");
        localStorage.removeItem("token");

        alert(
            "Your session has expired or is invalid. Please login again."
        );

        window.location.href =
            "login.html";

        return true;
    }

    return false;
}


// =====================================================
// LOGOUT
// =====================================================

function logoutUser() {

    localStorage.removeItem("user");
    localStorage.removeItem("token");

    window.location.href =
        "login.html";
}