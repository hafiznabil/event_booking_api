// =====================================================
// EVENT BOOKING SYSTEM
// MY BOOKINGS - JWT VERSION
// =====================================================

const BOOKINGS_API =
    "http://localhost/event_booking_api/api/bookings.php";


// =====================================================
// GET USER + JWT TOKEN
// =====================================================

let user = null;
let token = null;

try {

    const userData =
        localStorage.getItem("user");

    token =
        localStorage.getItem("token");


    if (userData) {
        user = JSON.parse(userData);
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

    window.location.href =
        "login.html";

    throw new Error(
        "User not logged in"
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

    }

    else if (
        user.role === "organiser"
    ) {

        window.location.href =
            "organiser-dashboard.html";

    }

    else {

        window.location.href =
            "login.html";
    }


    throw new Error(
        "Invalid customer role"
    );
}


// =====================================================
// ELEMENTS
// =====================================================

const userInfo =
    document.getElementById(
        "userInfo"
    );

const loading =
    document.getElementById(
        "bookingLoading"
    );

const message =
    document.getElementById(
        "myBookingMessage"
    );

const container =
    document.getElementById(
        "myBookingsContainer"
    );

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


// =====================================================
// DISPLAY USER
// =====================================================

if (userInfo) {

    userInfo.innerHTML = `
        <strong>
            ${escapeHTML(user.name)}
        </strong>

        <span>
            ${escapeHTML(user.role)}
        </span>
    `;
}


// =====================================================
// JWT AUTHENTICATION HEADERS
// =====================================================

function getAuthHeaders(
    includeContentType = false
) {

    const headers = {

        "Authorization":
            `Bearer ${token}`

    };


    if (includeContentType) {

        headers["Content-Type"] =
            "application/json";
    }


    return headers;
}


// =====================================================
// HANDLE JWT ERROR
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
// SHOW MESSAGE
// =====================================================

function showMessage(
    text,
    type = "error"
) {

    if (!message) {
        return;
    }


    message.textContent =
        text;

    message.className =
        type === "success"
            ? "success-message"
            : "error-message";

    message.style.display =
        "block";
}


// =====================================================
// CLEAR MESSAGE
// =====================================================

function clearMessage() {

    if (!message) {
        return;
    }


    message.textContent = "";

    message.className = "";

    message.style.display =
        "none";
}


// =====================================================
// QUICKCHART EXTERNAL QR API
// =====================================================

async function generateQRCode(
    booking
) {

    const qrContainer =
        document.getElementById(
            `qr-${booking.booking_id}`
        );


    if (!qrContainer) {
        return;
    }


    qrContainer.innerHTML = `
        <p class="qr-loading">
            Generating QR ticket...
        </p>
    `;


    // =================================================
    // INFORMATION ENCODED INSIDE QR
    // =================================================

    const ticketData = `
EVENT BOOKING TICKET
Booking ID: ${booking.booking_id}
Customer: ${user.name}
Event: ${booking.event_name}
Date: ${booking.event_date}
Time: ${booking.event_time}
Tickets: ${booking.quantity}
Total: RM ${Number(
        booking.total_amount || 0
    ).toFixed(2)}
Status: ${booking.booking_status}
    `.trim();


    try {

        // =============================================
        // QUICKCHART EXTERNAL API REQUEST
        // =============================================

        const response =
            await fetch(
                "https://quickchart.io/qr-url",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            text:
                                ticketData,

                            size:
                                220,

                            format:
                                "png",

                            caption:
                                `Booking #${booking.booking_id}`
                        })
                }
            );


        if (!response.ok) {

            throw new Error(
                `QuickChart API returned ${response.status}`
            );
        }


        const result =
            await response.json();


        console.log(
            `QuickChart API - Booking ${booking.booking_id}:`,
            result
        );


        if (!result.url) {

            throw new Error(
                "QR URL was not returned by QuickChart API."
            );
        }


        // =============================================
        // DISPLAY QR CODE
        // =============================================

        qrContainer.innerHTML = `

            <div class="qr-ticket">

                <h3>
                    Booking QR Ticket
                </h3>

                <p>
                    Present this QR code during
                    event check-in.
                </p>

                <img
                    src="${escapeHTML(result.url)}"
                    alt="QR Code for Booking ${escapeHTML(
                        booking.booking_id
                    )}"
                    class="booking-qr-code"
                >

                <small>
                    Booking #${escapeHTML(
                        booking.booking_id
                    )}
                </small>

            </div>
        `;


    } catch (error) {

        console.error(
            "QuickChart QR API Error:",
            error
        );


        qrContainer.innerHTML = `

            <p class="qr-error">

                QR ticket is temporarily unavailable.

            </p>
        `;
    }
}


// =====================================================
// LOAD CUSTOMER BOOKINGS
// =====================================================

async function loadBookings() {

    clearMessage();


    if (loading) {

        loading.style.display =
            "block";
    }


    if (container) {

        container.innerHTML = "";
    }


    try {

        // =============================================
        // GET CUSTOMER BOOKINGS WITH JWT
        // =============================================

        const response =
            await fetch(

                `${BOOKINGS_API}?customer_id=${encodeURIComponent(
                    user.user_id
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
                "Invalid response from bookings API."
            );
        }


        console.log(
            "My Bookings API:",
            result
        );


        if (loading) {

            loading.style.display =
                "none";
        }


        // =============================================
        // JWT INVALID / EXPIRED
        // =============================================

        if (response.status === 401) {

            handleAuthenticationError();

            return;
        }


        // =============================================
        // ACCESS DENIED
        // =============================================

        if (response.status === 403) {

            showMessage(
                result.message ||
                "Access denied."
            );

            return;
        }


        // =============================================
        // API ERROR
        // =============================================

        if (
            !response.ok ||
            result.success === false
        ) {

            showMessage(
                result.message ||
                "Failed to load bookings."
            );

            return;
        }


        // =============================================
        // GET BOOKING ARRAY
        // =============================================

        let bookings = [];


        if (
            result &&
            Array.isArray(result.data)
        ) {

            bookings =
                result.data;

        }

        else if (
            Array.isArray(result)
        ) {

            bookings =
                result;
        }


        // =============================================
        // EXTRA CUSTOMER SAFETY FILTER
        // =============================================

        bookings =
            bookings.filter(
                booking =>

                    Number(
                        booking.customer_id
                    ) ===
                    Number(
                        user.user_id
                    )
            );


        // =============================================
        // NO BOOKINGS
        // =============================================

        if (
            bookings.length === 0
        ) {

            if (container) {

                container.innerHTML = `

                    <div class="empty-bookings">

                        <h2>
                            No Bookings Yet
                        </h2>

                        <p>
                            You have not booked
                            any events yet.
                        </p>

                        <a
                            href="events.html"
                            class="browse-events-btn">

                            Browse Events

                        </a>

                    </div>
                `;
            }


            return;
        }


        if (!container) {
            return;
        }


        // =============================================
        // DISPLAY BOOKINGS
        // =============================================

        bookings.forEach(
            function (booking) {

                createBookingCard(
                    booking
                );
            }
        );


    } catch (error) {

        console.error(
            "Error loading bookings:",
            error
        );


        if (loading) {

            loading.style.display =
                "none";
        }


        showMessage(
            error.message ||
            "Cannot connect to the server."
        );
    }
}


// =====================================================
// CREATE BOOKING CARD
// =====================================================

function createBookingCard(
    booking
) {

    if (!container) {
        return;
    }


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "my-booking-card";


    const amount =
        Number(
            booking.total_amount ||
            0
        ).toFixed(2);


    const status =
        booking.booking_status ||
        "pending";


    const statusLower =
        String(status)
            .toLowerCase();


    // =================================================
    // CANCEL BUTTON
    // =================================================

    let cancelButton = "";


    if (
        statusLower !==
        "cancelled"
    ) {

        cancelButton = `

            <button
                class="cancel-booking-btn"
                data-booking-id="${escapeHTML(
                    booking.booking_id
                )}"
                data-quantity="${escapeHTML(
                    booking.quantity
                )}">

                Cancel Booking

            </button>
        `;
    }


    // =================================================
    // QR SECTION
    // =================================================

    let qrSection = "";


    if (
        statusLower ===
        "confirmed"
    ) {

        qrSection = `

            <div
                class="booking-qr-section"
                id="qr-${escapeHTML(
                    booking.booking_id
                )}">

                <p>
                    Preparing QR ticket...
                </p>

            </div>
        `;

    }

    else if (
        statusLower ===
        "cancelled"
    ) {

        qrSection = `

            <div
                class="booking-qr-section">

                <p class="qr-cancelled">

                    QR ticket unavailable -
                    booking cancelled.

                </p>

            </div>
        `;
    }


    // =================================================
    // CARD HTML
    // =================================================

    card.innerHTML = `

        <div class="booking-card-top">

            <span
                class="booking-status ${escapeHTML(
                    statusLower
                )}">

                ${escapeHTML(status)}

            </span>


            <span class="booking-id">

                Booking #${escapeHTML(
                    booking.booking_id
                )}

            </span>

        </div>


        <h2>
            ${escapeHTML(
                booking.event_name ||
                "-"
            )}
        </h2>


        <div class="booking-info-grid">

            <div>

                <span>
                    Date
                </span>

                <strong>
                    ${escapeHTML(
                        booking.event_date ||
                        "-"
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Time
                </span>

                <strong>
                    ${escapeHTML(
                        booking.event_time ||
                        "-"
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Tickets
                </span>

                <strong>
                    ${escapeHTML(
                        booking.quantity ||
                        "0"
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Total Amount
                </span>

                <strong>
                    RM ${amount}
                </strong>

            </div>

        </div>


        <div class="booking-date">

            Booked on:

            ${escapeHTML(
                booking.booking_date ||
                booking.created_at ||
                "-"
            )}

        </div>


        ${qrSection}


        ${cancelButton}
    `;


    container.appendChild(
        card
    );


    // =================================================
    // CANCEL BUTTON EVENT
    // =================================================

    const cancelBtn =
        card.querySelector(
            ".cancel-booking-btn"
        );


    if (cancelBtn) {

        cancelBtn.addEventListener(
            "click",
            function () {

                const bookingId =
                    Number(
                        this.dataset.bookingId
                    );


                const quantity =
                    Number(
                        this.dataset.quantity
                    );


                cancelBooking(
                    bookingId,
                    quantity
                );
            }
        );
    }


    // =================================================
    // GENERATE QR FOR CONFIRMED BOOKING
    // =================================================

    if (
        statusLower ===
        "confirmed"
    ) {

        generateQRCode(
            booking
        );
    }
}


// =====================================================
// CANCEL BOOKING
// =====================================================

async function cancelBooking(
    bookingId,
    quantity
) {

    const confirmCancel =
        confirm(
            "Are you sure you want to cancel this booking?"
        );


    if (!confirmCancel) {
        return;
    }


    clearMessage();


    try {

        // =============================================
        // PUT REQUEST WITH JWT
        // =============================================

        const response =
            await fetch(

                `${BOOKINGS_API}?id=${encodeURIComponent(
                    bookingId
                )}`,

                {
                    method: "PUT",

                    headers:
                        getAuthHeaders(true),

                    body:
                        JSON.stringify({

                            quantity:
                                Number(
                                    quantity
                                ),

                            booking_status:
                                "cancelled"
                        })
                }
            );


        let result;


        try {

            result =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                "Invalid response from bookings API."
            );
        }


        console.log(
            "Cancel Booking:",
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

            showMessage(
                result.message ||
                "Access denied."
            );

            return;
        }


        // =============================================
        // API ERROR
        // =============================================

        if (
            !response.ok ||
            result.success === false
        ) {

            showMessage(
                result.message ||
                "Failed to cancel booking."
            );

            return;
        }


        // =============================================
        // SUCCESS
        // =============================================

        showMessage(
            "Booking cancelled successfully.",
            "success"
        );


        // Reload booking list
        await loadBookings();


    } catch (error) {

        console.error(
            "Cancel Booking Error:",
            error
        );


        showMessage(
            error.message ||
            "Cannot connect to the server."
        );
    }
}


// =====================================================
// LOGOUT
// =====================================================

function logout() {

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

            const confirmLogout =
                confirm(
                    "Are you sure you want to logout?"
                );


            if (!confirmLogout) {
                return;
            }


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

        loadBookings();
    }
);