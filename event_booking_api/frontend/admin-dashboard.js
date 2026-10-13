// ==========================================
// ADMIN DASHBOARD - JWT VERSION
// ==========================================


// ==========================================
// GET LOGGED IN USER + TOKEN
// ==========================================

let user = null;

try {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
        user = JSON.parse(storedUser);
    }
} catch (error) {
    localStorage.removeItem("user");
}


// Get JWT token
const token = localStorage.getItem("token");


// ==========================================
// CHECK LOGIN
// ==========================================

if (!user || !token) {

    localStorage.removeItem("user");
    localStorage.removeItem("token");

    window.location.href = "login.html";
}


// ==========================================
// CHECK ADMIN ROLE
// ==========================================

if (user && user.role !== "admin") {
    window.location.href = "events.html";
}


// ==========================================
// JWT AUTH HEADERS
// ==========================================

function getAuthHeaders() {

    return {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
    };
}


// ==========================================
// DISPLAY ADMIN NAME
// ==========================================

const adminName =
    document.getElementById("adminName");

if (adminName && user) {
    adminName.textContent = user.name;
}


// ==========================================
// API URLS
// ==========================================

const EVENTS_API =
    "http://localhost/event_booking_api/api/events.php";

const USERS_API =
    "http://localhost/event_booking_api/api/users.php";

const BOOKINGS_API =
    "http://localhost/event_booking_api/api/bookings.php";


// ==========================================
// DISPLAY ERROR
// ==========================================

function showError(message) {

    const errorBox =
        document.getElementById("errorMessage");

    if (!errorBox) {
        return;
    }

    errorBox.textContent = message;
    errorBox.style.display = "block";
}


// ==========================================
// CLEAR ERROR
// ==========================================

function clearError() {

    const errorBox =
        document.getElementById("errorMessage");

    if (!errorBox) {
        return;
    }

    errorBox.textContent = "";
    errorBox.style.display = "none";
}


// ==========================================
// EXTRACT ARRAY FROM API RESPONSE
// ==========================================

function extractData(result) {

    if (Array.isArray(result)) {
        return result;
    }

    if (
        result &&
        Array.isArray(result.data)
    ) {
        return result.data;
    }

    return [];
}


// ==========================================
// HANDLE UNAUTHORIZED JWT
// ==========================================

function handleUnauthorized(response) {

    if (
        response.status === 401 ||
        response.status === 403
    ) {

        localStorage.removeItem("user");
        localStorage.removeItem("token");

        alert(
            "Your session is invalid or expired. Please login again."
        );

        window.location.href =
            "login.html";

        return true;
    }

    return false;
}


// ==========================================
// LOAD DASHBOARD
// ==========================================

async function loadDashboard() {

    clearError();

    try {

        const headers = getAuthHeaders();


        // ==================================
        // SEND REQUESTS WITH JWT
        // ==================================

        const [
            eventsResponse,
            usersResponse,
            bookingsResponse
        ] = await Promise.all([

            fetch(EVENTS_API, {
                method: "GET",
                headers: headers
            }),

            fetch(USERS_API, {
                method: "GET",
                headers: headers
            }),

            fetch(BOOKINGS_API, {
                method: "GET",
                headers: headers
            })

        ]);


        // ==================================
        // CHECK JWT AUTH
        // ==================================

        if (
            handleUnauthorized(eventsResponse) ||
            handleUnauthorized(usersResponse) ||
            handleUnauthorized(bookingsResponse)
        ) {
            return;
        }


        // ==================================
        // READ JSON
        // ==================================

        const eventsResult =
            await eventsResponse.json();

        const usersResult =
            await usersResponse.json();

        const bookingsResult =
            await bookingsResponse.json();


        // ==================================
        // CHECK API ERRORS
        // ==================================

        if (!eventsResponse.ok) {

            throw new Error(
                eventsResult.message ||
                "Failed to load events."
            );
        }


        if (!usersResponse.ok) {

            throw new Error(
                usersResult.message ||
                "Failed to load users."
            );
        }


        if (!bookingsResponse.ok) {

            throw new Error(
                bookingsResult.message ||
                "Failed to load bookings."
            );
        }


        // ==================================
        // GET ARRAYS
        // ==================================

        const events =
            extractData(eventsResult);

        const users =
            extractData(usersResult);

        const bookings =
            extractData(bookingsResult);


        // ==================================
        // CONFIRMED BOOKINGS
        // ==================================

        const confirmedBookings =
            bookings.filter(booking => {

                return String(
                    booking.booking_status || ""
                ).toLowerCase() === "confirmed";

            });


        // ==================================
        // DISPLAY STATISTICS
        // ==================================

        const totalEvents =
            document.getElementById("totalEvents");

        const totalUsers =
            document.getElementById("totalUsers");

        const totalBookings =
            document.getElementById("totalBookings");

        const confirmedBookingsElement =
            document.getElementById(
                "confirmedBookings"
            );


        if (totalEvents) {
            totalEvents.textContent =
                events.length;
        }


        if (totalUsers) {
            totalUsers.textContent =
                users.length;
        }


        if (totalBookings) {
            totalBookings.textContent =
                bookings.length;
        }


        if (confirmedBookingsElement) {
            confirmedBookingsElement.textContent =
                confirmedBookings.length;
        }


        console.log(
            "JWT Dashboard loaded successfully:",
            {
                events: events.length,
                users: users.length,
                bookings: bookings.length,
                confirmed:
                    confirmedBookings.length
            }
        );

    } catch (error) {

        console.error(
            "Dashboard Error:",
            error
        );

        showError(
            error.message ||
            "Unable to load dashboard data."
        );
    }
}


// ==========================================
// LOGOUT
// ==========================================

const logoutBtn =
    document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        function () {

            const confirmed = confirm(
                "Are you sure you want to logout?"
            );

            if (!confirmed) {
                return;
            }

            // Remove JWT authentication data
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem("loggedInUser");

            window.location.href =
                "login.html";
        }
    );
}


// ==========================================
// START
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {
        loadDashboard();
    }
);