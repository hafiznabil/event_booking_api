// =====================================================
// EVENT BOOKING SYSTEM
// EVENTS PAGE - CUSTOMER
// =====================================================


// =====================================================
// GET LOGGED-IN USER
// =====================================================

let user = null;
let token = null;

try {

    const userData =
        localStorage.getItem("user");

    token =
        localStorage.getItem("token");


    if (userData) {

        user =
            JSON.parse(userData);
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
        "Authentication required"
    );
}


// =====================================================
// CUSTOMER ONLY
// =====================================================

if (user.role !== "customer") {

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
        "Customer access required"
    );
}


// =====================================================
// ELEMENTS
// =====================================================

const userInfo =
    document.getElementById(
        "userInfo"
    );

const container =
    document.getElementById(
        "eventsContainer"
    );

const loading =
    document.getElementById(
        "loading"
    );

const message =
    document.getElementById(
        "eventMessage"
    );

const searchInput =
    document.getElementById(
        "eventSearchInput"
    );

const searchButton =
    document.getElementById(
        "eventSearchButton"
    );

const clearSearchButton =
    document.getElementById(
        "clearSearchButton"
    );

const searchResultInfo =
    document.getElementById(
        "searchResultInfo"
    );


// =====================================================
// DISPLAY USER
// =====================================================

if (userInfo) {

    userInfo.innerHTML = `

        <strong>
            ${escapeHTML(
                user.name || "Customer"
            )}
        </strong>

        <span>
            ${escapeHTML(
                user.role || "customer"
            )}
        </span>
    `;
}


// =====================================================
// JWT AUTH HEADERS
// =====================================================

function getAuthHeaders() {

    return {

        "Authorization":
            `Bearer ${token}`

    };
}


// =====================================================
// HANDLE AUTH ERROR
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
// LOAD EVENTS
// =====================================================

async function loadEvents(
    search = ""
) {

    if (loading) {

        loading.style.display =
            "block";
    }


    if (message) {

        message.textContent =
            "";

        message.className =
            "";
    }


    if (container) {

        container.innerHTML =
            "";
    }


    if (searchResultInfo) {

        searchResultInfo.textContent =
            "";
    }


    try {

        // =============================================
        // API URL
        // =============================================

        let apiURL =
            "http://localhost/event_booking_api/api/events.php?status=upcoming";


        // =============================================
        // SEARCH PARAMETER
        // =============================================

        if (
            search.trim() !== ""
        ) {

            apiURL +=
                "&search=" +
                encodeURIComponent(
                    search.trim()
                );
        }


        console.log(
            "Events API Request:",
            apiURL
        );


        // =============================================
        // CALL EVENTS API
        // =============================================

        const response =
            await fetch(
                apiURL,
                {
                    method: "GET",

                    headers:
                        getAuthHeaders()
                }
            );


        let result;


        try {

            result =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                "Invalid response from Events API."
            );
        }


        console.log(
            "Events API Response:",
            result
        );


        if (loading) {

            loading.style.display =
                "none";
        }


        // =============================================
        // JWT EXPIRED / INVALID
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

            if (message) {

                message.textContent =
                    result.message ||
                    "Access denied.";

                message.className =
                    "error-message";
            }

            return;
        }


        // =============================================
        // API ERROR
        // =============================================

        if (
            !response.ok ||
            result.success === false
        ) {

            if (message) {

                message.textContent =
                    result.message ||
                    "Failed to load events.";

                message.className =
                    "error-message";
            }

            return;
        }


        // =============================================
        // EVENT ARRAY
        // =============================================

        let events = [];


        if (
            result &&
            Array.isArray(
                result.data
            )
        ) {

            events =
                result.data;

        }

        else if (
            Array.isArray(result)
        ) {

            events =
                result;
        }


        // =============================================
        // SEARCH RESULT INFO
        // =============================================

        if (
            search.trim() !== "" &&
            searchResultInfo
        ) {

            searchResultInfo.innerHTML = `

                Found

                <strong>
                    ${events.length}
                </strong>

                event(s) for

                "<strong>
                    ${escapeHTML(
                        search.trim()
                    )}
                </strong>"
            `;
        }


        // =============================================
        // NO EVENTS
        // =============================================

        if (
            events.length === 0
        ) {

            if (container) {

                container.innerHTML = `

                    <div class="no-events">

                        <h3>
                            No Events Found
                        </h3>

                        <p>
                            No upcoming events match
                            your search.
                        </p>

                    </div>
                `;
            }


            return;
        }


        // =============================================
        // DISPLAY EVENTS
        // =============================================

        events.forEach(

            function (event) {

                createEventCard(
                    event
                );
            }
        );


    } catch (error) {

        console.error(
            "Error loading events:",
            error
        );


        if (loading) {

            loading.style.display =
                "none";
        }


        if (message) {

            message.textContent =
                error.message ||
                "Cannot load events. Please check the API connection.";

            message.className =
                "error-message";
        }
    }
}


// =====================================================
// CREATE EVENT CARD
// =====================================================

function createEventCard(
    event
) {

    if (!container) {
        return;
    }


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "event-card";


    const price =
        Number(
            event.ticket_price ||
            0
        ).toFixed(2);


    const availableTickets =
        Number(
            event.available_tickets ||
            0
        );


    const status =
        String(
            event.status ||
            "upcoming"
        ).toLowerCase();


    // =============================================
    // BOOK BUTTON
    // =============================================

    let bookButton;


    if (
        availableTickets <= 0
    ) {

        bookButton = `

            <button
                class="book-btn"
                disabled>

                Sold Out

            </button>
        `;

    } else {

        bookButton = `

            <button
                class="book-btn"
                data-event-id="${escapeHTML(
                    event.event_id
                )}">

                Book Event

            </button>
        `;
    }


    // =============================================
    // EVENT CARD HTML
    // =============================================

    card.innerHTML = `

        <div class="event-status">

            ${escapeHTML(status)}

        </div>


        <h2>

            ${escapeHTML(
                event.event_name ||
                "-"
            )}

        </h2>


        <p class="event-description">

            ${escapeHTML(
                event.description ||
                "No description available."
            )}

        </p>


        <div class="event-details">


            <p>

                <strong>
                    Date:
                </strong>

                ${escapeHTML(
                    event.event_date ||
                    "-"
                )}

            </p>


            <p>

                <strong>
                    Time:
                </strong>

                ${escapeHTML(
                    event.event_time ||
                    "-"
                )}

            </p>


            <p>

                <strong>
                    Venue:
                </strong>

                ${escapeHTML(
                    event.venue_name ||
                    "-"
                )}

            </p>


            <p>

                <strong>
                    Location:
                </strong>

                ${escapeHTML(
                    event.location ||
                    "-"
                )}

            </p>


            <p>

                <strong>
                    Available Tickets:
                </strong>

                ${availableTickets}

            </p>


        </div>


        <div class="event-footer">

            <div class="event-price">

                RM ${price}

            </div>


            ${bookButton}

        </div>
    `;


    container.appendChild(
        card
    );


    // =============================================
    // BOOK EVENT BUTTON EVENT
    // =============================================

    const button =
        card.querySelector(
            ".book-btn[data-event-id]"
        );


    if (button) {

        button.addEventListener(

            "click",

            function () {

                const selectedEventId =
                    this.dataset.eventId;


                bookEvent(
                    selectedEventId
                );
            }
        );
    }
}


// =====================================================
// SEARCH EVENTS
// =====================================================

function searchEvents() {

    if (!searchInput) {
        return;
    }


    const keyword =
        searchInput.value.trim();


    loadEvents(
        keyword
    );
}


// =====================================================
// CLEAR SEARCH
// =====================================================

function clearSearch() {

    if (searchInput) {

        searchInput.value =
            "";
    }


    if (searchResultInfo) {

        searchResultInfo.textContent =
            "";
    }


    loadEvents();
}


// =====================================================
// SEARCH BUTTON
// =====================================================

if (searchButton) {

    searchButton.addEventListener(

        "click",

        function () {

            searchEvents();

        }
    );
}


// =====================================================
// CLEAR SEARCH BUTTON
// =====================================================

if (clearSearchButton) {

    clearSearchButton.addEventListener(

        "click",

        function () {

            clearSearch();

        }
    );
}


// =====================================================
// PRESS ENTER TO SEARCH
// =====================================================

if (searchInput) {

    searchInput.addEventListener(

        "keydown",

        function (event) {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                searchEvents();
            }
        }
    );
}


// =====================================================
// BOOK EVENT
// FIXED:
// book-event.html?id=EVENT_ID
// =====================================================

function bookEvent(
    eventId
) {

    if (
        !eventId ||
        Number(eventId) <= 0
    ) {

        alert(
            "Invalid event ID."
        );

        return;
    }


    // Save as backup
    localStorage.setItem(
        "selected_event_id",
        String(eventId)
    );


    // IMPORTANT:
    // PASS EVENT ID THROUGH URL
    window.location.href =
        `book-event.html?id=${encodeURIComponent(
            eventId
        )}`;
}


// =====================================================
// BASIC HTML ESCAPE
// =====================================================

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
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
// START PAGE
// =====================================================

document.addEventListener(

    "DOMContentLoaded",

    function () {

        loadEvents();

    }
);