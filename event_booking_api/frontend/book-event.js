// =====================================================
// EVENT BOOKING SYSTEM
// BOOK EVENT - JWT VERSION
// =====================================================

const API_BASE =
    "http://localhost/event_booking_api/api";


// =====================================================
// GET USER + JWT TOKEN
// =====================================================

let user = null;
let token = null;

try {

    const storedUser =
        localStorage.getItem("user");

    token =
        localStorage.getItem("token");


    if (storedUser) {

        user =
            JSON.parse(storedUser);
    }

} catch (error) {

    console.error(
        "LocalStorage Error:",
        error
    );

    localStorage.removeItem("user");
    localStorage.removeItem("token");
}


// =====================================================
// CHECK LOGIN
// =====================================================

if (!user || !token) {

    localStorage.removeItem("user");
    localStorage.removeItem("token");

    alert(
        "Please login again."
    );

    window.location.href =
        "login.html";

    throw new Error(
        "Authentication required"
    );
}


// =====================================================
// CUSTOMER ONLY
// =====================================================

if (user.role !== "customer") {

    alert(
        "Access denied. Customer only."
    );


    if (user.role === "admin") {

        window.location.href =
            "admin-dashboard.html";

    } else if (
        user.role === "organiser"
    ) {

        window.location.href =
            "organiser-dashboard.html";

    } else {

        window.location.href =
            "login.html";
    }


    throw new Error(
        "Invalid customer role"
    );
}


// =====================================================
// GET EVENT ID
// Example:
// book-event.html?id=1
// =====================================================

const params =
    new URLSearchParams(
        window.location.search
    );

const eventId =
    params.get("id");


// =====================================================
// HTML ELEMENTS
// =====================================================

const loadingEvent =
    document.getElementById(
        "loadingEvent"
    );

const eventDetails =
    document.getElementById(
        "eventDetails"
    );

const bookingForm =
    document.getElementById(
        "bookingForm"
    );

const quantityInput =
    document.getElementById(
        "quantity"
    );

const ticketPriceElement =
    document.getElementById(
        "ticketPrice"
    );

const summaryQuantityElement =
    document.getElementById(
        "summaryQuantity"
    );

const totalPriceElement =
    document.getElementById(
        "totalPrice"
    );

const bookingMessage =
    document.getElementById(
        "bookingMessage"
    );

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


// =====================================================
// CURRENT EVENT
// =====================================================

let currentEvent = null;


// =====================================================
// JWT AUTH HEADERS
// =====================================================

function getAuthHeaders(
    includeJSON = false
) {

    const headers = {

        "Authorization":
            `Bearer ${token}`

    };


    if (includeJSON) {

        headers["Content-Type"] =
            "application/json";
    }


    return headers;
}


// =====================================================
// HANDLE AUTHENTICATION ERROR
// =====================================================

function handleAuthenticationError() {

    localStorage.removeItem(
        "user"
    );

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "selected_event_id"
    );


    alert(
        "Your login session is invalid or expired. Please login again."
    );


    window.location.href =
        "login.html";
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


// =====================================================
// FORMAT MONEY
// =====================================================

function formatMoney(value) {

    const amount =
        Number(value || 0);

    return `RM ${amount.toFixed(2)}`;
}


// =====================================================
// SHOW MESSAGE
// =====================================================

function showMessage(
    text,
    type = "error"
) {

    if (!bookingMessage) {
        return;
    }


    bookingMessage.textContent =
        text;


    bookingMessage.style.display =
        "block";


    bookingMessage.className =
        type === "success"
            ? "success-message"
            : "error-message";
}


// =====================================================
// CLEAR MESSAGE
// =====================================================

function clearMessage() {

    if (!bookingMessage) {
        return;
    }


    bookingMessage.textContent =
        "";

    bookingMessage.className =
        "";

    bookingMessage.style.display =
        "none";
}


// =====================================================
// LOAD EVENT
// =====================================================

async function loadEvent() {

    clearMessage();


    // =================================================
    // VALIDATE EVENT ID
    // =================================================

    if (
        !eventId ||
        Number(eventId) <= 0
    ) {

        if (loadingEvent) {

            loadingEvent.style.display =
                "none";
        }


        showMessage(
            "Invalid event ID."
        );

        return;
    }


    try {

        // =============================================
        // GET EVENT
        // =============================================

        const response =
            await fetch(

                `${API_BASE}/events.php?id=${encodeURIComponent(
                    eventId
                )}`,

                {
                    method: "GET",

                    headers:
                        getAuthHeaders(false)
                }
            );


        let result;


        try {

            result =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                "Invalid response from events API."
            );
        }


        console.log(
            "Event API:",
            result
        );


        // =============================================
        // JWT INVALID / EXPIRED
        // =============================================

        if (
            response.status === 401
        ) {

            handleAuthenticationError();

            return;
        }


        // =============================================
        // ACCESS DENIED
        // =============================================

        if (
            response.status === 403
        ) {

            throw new Error(

                result.message ||
                "Access denied."

            );
        }


        // =============================================
        // API ERROR
        // =============================================

        if (
            !response.ok ||
            result.success === false
        ) {

            throw new Error(

                result.message ||
                "Failed to load event."

            );
        }


        // =============================================
        // GET EVENT DATA
        // =============================================

        if (
            result.data &&
            !Array.isArray(
                result.data
            )
        ) {

            currentEvent =
                result.data;

        }

        else if (
            Array.isArray(
                result.data
            ) &&
            result.data.length > 0
        ) {

            currentEvent =
                result.data[0];

        }

        else if (
            Array.isArray(result) &&
            result.length > 0
        ) {

            currentEvent =
                result[0];

        }

        else if (
            result.event_id
        ) {

            currentEvent =
                result;

        }

        else {

            throw new Error(
                "Event not found."
            );
        }


        // =============================================
        // HIDE LOADING
        // =============================================

        if (loadingEvent) {

            loadingEvent.style.display =
                "none";
        }


        // =============================================
        // DISPLAY EVENT
        // =============================================

        displayEvent();


        // =============================================
        // SHOW BOOKING FORM
        // =============================================

        if (bookingForm) {

            bookingForm.style.display =
                "block";
        }


        // =============================================
        // UPDATE PRICE
        // =============================================

        updateBookingSummary();


    } catch (error) {

        console.error(
            "Load Event Error:",
            error
        );


        if (loadingEvent) {

            loadingEvent.style.display =
                "none";
        }


        showMessage(

            error.message ||
            "Unable to load event."

        );
    }
}


// =====================================================
// DISPLAY EVENT DETAILS
// =====================================================

function displayEvent() {

    if (
        !currentEvent ||
        !eventDetails
    ) {

        return;
    }


    const status =
        String(
            currentEvent.status ||
            "upcoming"
        ).toLowerCase();


    const availableTickets =
        Number(
            currentEvent.available_tickets ??
            0
        );


    eventDetails.innerHTML = `

        <div class="event-card">

            <span
                class="status-badge status-${escapeHTML(
                    status
                )}">

                ${escapeHTML(
                    status.toUpperCase()
                )}

            </span>


            <h2>

                ${escapeHTML(
                    currentEvent.event_name ||
                    "-"
                )}

            </h2>


            <p>

                ${escapeHTML(
                    currentEvent.description ||
                    "-"
                )}

            </p>


            <hr>


            <div class="event-info-grid">


                <div>

                    <strong>
                        Date:
                    </strong>

                    <br>

                    ${escapeHTML(
                        currentEvent.event_date ||
                        "-"
                    )}

                </div>


                <div>

                    <strong>
                        Time:
                    </strong>

                    <br>

                    ${escapeHTML(
                        currentEvent.event_time ||
                        "-"
                    )}

                </div>


                <div>

                    <strong>
                        Venue:
                    </strong>

                    <br>

                    ${escapeHTML(
                        currentEvent.venue_name ||
                        "-"
                    )}

                </div>


                <div>

                    <strong>
                        Location:
                    </strong>

                    <br>

                    ${escapeHTML(
                        currentEvent.location ||
                        "-"
                    )}

                </div>


                <div>

                    <strong>
                        Available Tickets:
                    </strong>

                    <br>

                    ${availableTickets}

                </div>


            </div>

        </div>
    `;


    // =================================================
    // QUANTITY LIMIT
    // =================================================

    if (quantityInput) {

        quantityInput.min =
            "1";

        quantityInput.max =
            String(
                availableTickets
            );

        quantityInput.value =
            "1";


        if (
            availableTickets <= 0
        ) {

            quantityInput.disabled =
                true;


            const button =
                bookingForm?.querySelector(
                    'button[type="submit"]'
                );


            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    "Sold Out";
            }
        }
    }
}


// =====================================================
// UPDATE BOOKING SUMMARY
// =====================================================

function updateBookingSummary() {

    if (!currentEvent) {
        return;
    }


    let quantity =
        Number(
            quantityInput?.value ||
            1
        );


    if (
        !Number.isInteger(
            quantity
        ) ||
        quantity < 1
    ) {

        quantity = 1;
    }


    const ticketPrice =
        Number(
            currentEvent.ticket_price ||
            0
        );


    const total =
        ticketPrice *
        quantity;


    // PRICE PER TICKET
    if (ticketPriceElement) {

        ticketPriceElement.textContent =
            formatMoney(
                ticketPrice
            );
    }


    // QUANTITY
    if (
        summaryQuantityElement
    ) {

        summaryQuantityElement.textContent =
            String(quantity);
    }


    // TOTAL
    if (totalPriceElement) {

        totalPriceElement.textContent =
            formatMoney(
                total
            );
    }
}


// =====================================================
// QUANTITY INPUT
// =====================================================

if (quantityInput) {

    quantityInput.addEventListener(

        "input",

        function () {

            clearMessage();

            updateBookingSummary();
        }
    );
}


// =====================================================
// BOOKING FORM
// =====================================================

if (bookingForm) {

    bookingForm.addEventListener(

        "submit",

        async function (event) {

            event.preventDefault();

            clearMessage();


            // =========================================
            // CHECK EVENT
            // =========================================

            if (!currentEvent) {

                showMessage(
                    "Event information is unavailable."
                );

                return;
            }


            // =========================================
            // QUANTITY
            // =========================================

            const quantity =
                Number(
                    quantityInput.value
                );


            // =========================================
            // VALIDATE QUANTITY
            // =========================================

            if (
                !Number.isInteger(
                    quantity
                ) ||
                quantity < 1
            ) {

                showMessage(
                    "Please enter a valid ticket quantity."
                );

                return;
            }


            const availableTickets =
                Number(
                    currentEvent.available_tickets ??
                    0
                );


            if (
                quantity >
                availableTickets
            ) {

                showMessage(

                    `Only ${availableTickets} ticket(s) are available.`

                );

                return;
            }


            // =========================================
            // SUBMIT BUTTON
            // =========================================

            const submitButton =
                bookingForm.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Processing...";
            }


            try {

                // =====================================
                // CREATE BOOKING USING JWT
                // =====================================

                const response =
                    await fetch(

                        `${API_BASE}/bookings.php`,

                        {
                            method:
                                "POST",

                            headers:
                                getAuthHeaders(
                                    true
                                ),

                            body:
                                JSON.stringify({

                                    event_id:
                                        Number(
                                            currentEvent.event_id
                                        ),

                                    quantity:
                                        quantity

                                })
                        }
                    );


                let result;


                try {

                    result =
                        await response.json();

                } catch (
                    jsonError
                ) {

                    throw new Error(
                        "Invalid response from bookings API."
                    );
                }


                console.log(
                    "Create Booking:",
                    result
                );


                // =====================================
                // JWT INVALID / EXPIRED
                // =====================================

                if (
                    response.status ===
                    401
                ) {

                    handleAuthenticationError();

                    return;
                }


                // =====================================
                // ACCESS DENIED
                // =====================================

                if (
                    response.status ===
                    403
                ) {

                    throw new Error(

                        result.message ||
                        "Access denied."

                    );
                }


                // =====================================
                // API ERROR
                // =====================================

                if (
                    !response.ok ||
                    result.success ===
                        false
                ) {

                    throw new Error(

                        result.message ||
                        "Booking failed."

                    );
                }


                // =====================================
                // SUCCESS
                // =====================================

                showMessage(

                    "Booking confirmed successfully!",

                    "success"
                );


                if (submitButton) {

                    submitButton.textContent =
                        "Booking Confirmed";
                }


                // =====================================
                // REDIRECT TO MY BOOKINGS
                // =====================================

                setTimeout(

                    function () {

                        window.location.href =
                            "my-bookings.html";

                    },

                    1200
                );


            } catch (error) {

                console.error(
                    "Booking Error:",
                    error
                );


                showMessage(

                    error.message ||
                    "Unable to create booking."

                );


                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Confirm Booking";
                }
            }
        }
    );
}


// =====================================================
// LOGOUT
// =====================================================

function logout() {

    const confirmLogout =
        confirm(
            "Are you sure you want to logout?"
        );


    if (!confirmLogout) {
        return;
    }


    localStorage.removeItem(
        "user"
    );

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "selected_event_id"
    );

    localStorage.removeItem(
        "loggedInUser"
    );


    window.location.href =
        "login.html";
}


// =====================================================
// LOGOUT BUTTON SUPPORT
// =====================================================

if (logoutBtn) {

    logoutBtn.addEventListener(

        "click",

        function () {

            logout();

        }
    );
}


// =====================================================
// START
// =====================================================

document.addEventListener(

    "DOMContentLoaded",

    function () {

        loadEvent();

    }
);