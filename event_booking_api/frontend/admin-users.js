// =====================================================
// EVENT BOOKING SYSTEM
// ADMIN USER MANAGEMENT - JWT VERSION
// =====================================================

const API_URL =
    "http://localhost/event_booking_api/api/users.php";

let editingUserId = null;


// =====================================================
// GET CURRENT USER
// =====================================================

function getCurrentUser() {

    const userData =
        localStorage.getItem("user");

    if (!userData) {
        return null;
    }

    try {

        return JSON.parse(userData);

    } catch (error) {

        console.error(
            "Invalid user data:",
            error
        );

        localStorage.removeItem("user");

        return null;
    }
}


// =====================================================
// GET JWT TOKEN
// =====================================================

function getToken() {

    return localStorage.getItem("token");
}


// =====================================================
// JWT AUTH HEADERS
// =====================================================

function getAuthHeaders(includeJson = false) {

    const token = getToken();

    if (!token) {
        return {};
    }

    const headers = {
        "Authorization": "Bearer " + token
    };

    if (includeJson) {
        headers["Content-Type"] =
            "application/json";
    }

    return headers;
}


// =====================================================
// HANDLE UNAUTHORIZED / EXPIRED TOKEN
// =====================================================

function handleUnauthorized(response) {

    if (
        response.status === 401 ||
        response.status === 403
    ) {

        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem(
            "loggedInUser"
        );

        alert(
            "Your session is invalid or expired. Please login again."
        );

        window.location.href =
            "login.html";

        return true;
    }

    return false;
}


// =====================================================
// CHECK ADMIN LOGIN
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const user =
            getCurrentUser();

        const token =
            getToken();


        // ==============================================
        // USER OR TOKEN NOT FOUND
        // ==============================================

        if (!user || !token) {

            localStorage.removeItem("user");
            localStorage.removeItem("token");

            window.location.href =
                "login.html";

            return;
        }


        // ==============================================
        // ADMIN ONLY
        // ==============================================

        if (user.role !== "admin") {

            window.location.href =
                "events.html";

            return;
        }


        // ==============================================
        // DISPLAY ADMIN INFORMATION
        // ==============================================

        const adminName =
            document.getElementById(
                "adminName"
            );

        const adminRole =
            document.getElementById(
                "adminRole"
            );


        if (adminName) {

            adminName.textContent =
                user.name ||
                "System Administrator";
        }


        if (adminRole) {

            adminRole.textContent =
                "Admin";
        }


        // ==============================================
        // LOAD USERS
        // ==============================================

        loadUsers();
    }
);


// =====================================================
// LOAD ALL USERS
// =====================================================

async function loadUsers() {

    const usersGrid =
        document.getElementById(
            "usersGrid"
        );


    if (!usersGrid) {
        return;
    }


    usersGrid.innerHTML =
        "<p>Loading users...</p>";


    try {

        const response =
            await fetch(
                API_URL,
                {
                    method: "GET",
                    headers:
                        getAuthHeaders()
                }
            );


        // ==============================================
        // CHECK JWT
        // ==============================================

        if (handleUnauthorized(response)) {
            return;
        }


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Failed to load users"
            );
        }


        const users =
            result.data || [];


        // ==============================================
        // NO USERS
        // ==============================================

        if (users.length === 0) {

            usersGrid.innerHTML = `
                <p>No users found.</p>
            `;

            return;
        }


        usersGrid.innerHTML = "";


        // ==============================================
        // DISPLAY USER CARDS
        // ==============================================

        users.forEach(user => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "user-card";


            const role =
                String(
                    user.role || ""
                ).toLowerCase();


            let roleClass =
                "role-customer";


            if (role === "admin") {

                roleClass =
                    "role-admin";
            }


            if (role === "organiser") {

                roleClass =
                    "role-organiser";
            }


            card.innerHTML = `

                <div class="user-card-header">

                    <span class="role-badge ${roleClass}">
                        ${escapeHTML(role)}
                    </span>

                    <small>
                        User #${user.user_id}
                    </small>

                </div>


                <h3>
                    ${escapeHTML(user.name)}
                </h3>


                <div class="user-info">

                    <small>Email</small>

                    <strong>
                        ${escapeHTML(user.email)}
                    </strong>

                </div>


                <div class="user-info">

                    <small>Role</small>

                    <strong>
                        ${escapeHTML(role)}
                    </strong>

                </div>


                <div class="user-info">

                    <small>Created At</small>

                    <strong>
                        ${escapeHTML(
                            user.created_at || "-"
                        )}
                    </strong>

                </div>


                <div class="user-actions">

                    <button
                        class="edit-btn"
                        onclick="editUser(${user.user_id})">

                        Edit

                    </button>


                    <button
                        class="delete-btn"
                        onclick="deleteUser(${user.user_id})">

                        Delete

                    </button>

                </div>
            `;


            usersGrid.appendChild(
                card
            );
        });


    } catch (error) {

        console.error(
            "Load users error:",
            error
        );


        usersGrid.innerHTML = `

            <p style="color:red;">
                ${escapeHTML(
                    error.message
                )}
            </p>
        `;
    }
}


// =====================================================
// SHOW ADD USER FORM
// =====================================================

function showAddUserForm() {

    editingUserId = null;


    document.getElementById(
        "formTitle"
    ).textContent =
        "Add New User";


    document.getElementById(
        "userId"
    ).value = "";


    document.getElementById(
        "name"
    ).value = "";


    document.getElementById(
        "email"
    ).value = "";


    document.getElementById(
        "password"
    ).value = "";


    document.getElementById(
        "role"
    ).value = "";


    document.getElementById(
        "passwordGroup"
    ).style.display =
        "block";


    document.getElementById(
        "password"
    ).required =
        true;


    document.getElementById(
        "userFormSection"
    ).style.display =
        "block";


    document.getElementById(
        "userFormSection"
    ).scrollIntoView({
        behavior: "smooth"
    });
}


// =====================================================
// CLOSE USER FORM
// =====================================================

function closeUserForm() {

    editingUserId = null;


    const form =
        document.getElementById(
            "userForm"
        );


    if (form) {
        form.reset();
    }


    document.getElementById(
        "userId"
    ).value = "";


    document.getElementById(
        "userFormSection"
    ).style.display =
        "none";
}


// =====================================================
// USER FORM
// ADD / UPDATE USER
// =====================================================

const userForm =
    document.getElementById(
        "userForm"
    );


if (userForm) {

    userForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            // ==========================================
            // FORM VALUES
            // ==========================================

            const name =
                document
                    .getElementById("name")
                    .value
                    .trim();


            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();


            const password =
                document
                    .getElementById("password")
                    .value;


            const role =
                document
                    .getElementById("role")
                    .value;


            // ==========================================
            // BASIC VALIDATION
            // ==========================================

            if (
                !name ||
                !email ||
                !role
            ) {

                showMessage(
                    "Please complete all required fields.",
                    "error"
                );

                return;
            }


            // ==========================================
            // EMAIL VALIDATION
            // ==========================================

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailPattern.test(email)
            ) {

                showMessage(
                    "Please enter a valid email address.",
                    "error"
                );

                return;
            }


            let method =
                "POST";

            let url =
                API_URL;


            let body = {

                name: name,

                email: email,

                role: role
            };


            // ==========================================
            // ADD USER
            // ==========================================

            if (!editingUserId) {

                if (!password) {

                    showMessage(
                        "Password is required.",
                        "error"
                    );

                    return;
                }


                if (
                    password.length < 6
                ) {

                    showMessage(
                        "Password must contain at least 6 characters.",
                        "error"
                    );

                    return;
                }


                body.password =
                    password;
            }


            // ==========================================
            // EDIT USER
            // ==========================================

            else {

                method =
                    "PUT";


                url =
                    API_URL +
                    "?id=" +
                    encodeURIComponent(
                        editingUserId
                    );
            }


            try {

                const response =
                    await fetch(
                        url,
                        {
                            method: method,

                            headers:
                                getAuthHeaders(
                                    true
                                ),

                            body:
                                JSON.stringify(
                                    body
                                )
                        }
                    );


                // ======================================
                // JWT CHECK
                // ======================================

                if (
                    handleUnauthorized(
                        response
                    )
                ) {
                    return;
                }


                const result =
                    await response.json();


                if (
                    !response.ok ||
                    !result.success
                ) {

                    throw new Error(
                        result.message ||
                        "Operation failed"
                    );
                }


                // ======================================
                // SUCCESS MESSAGE
                // ======================================

                if (editingUserId) {

                    showMessage(
                        "User updated successfully.",
                        "success"
                    );

                } else {

                    showMessage(
                        "User created successfully.",
                        "success"
                    );
                }


                closeUserForm();

                await loadUsers();


            } catch (error) {

                console.error(
                    "Save user error:",
                    error
                );


                showMessage(
                    error.message,
                    "error"
                );
            }
        }
    );
}


// =====================================================
// EDIT USER
// =====================================================

async function editUser(id) {

    try {

        const response =
            await fetch(

                API_URL +
                "?id=" +
                encodeURIComponent(id),

                {
                    method: "GET",

                    headers:
                        getAuthHeaders()
                }
            );


        // ==============================================
        // JWT CHECK
        // ==============================================

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Failed to load user"
            );
        }


        const user =
            result.data;


        editingUserId =
            user.user_id;


        // ==============================================
        // POPULATE FORM
        // ==============================================

        document.getElementById(
            "formTitle"
        ).textContent =
            "Edit User";


        document.getElementById(
            "userId"
        ).value =
            user.user_id;


        document.getElementById(
            "name"
        ).value =
            user.name;


        document.getElementById(
            "email"
        ).value =
            user.email;


        document.getElementById(
            "role"
        ).value =
            user.role;


        // ==============================================
        // PASSWORD NOT REQUIRED DURING EDIT
        // ==============================================

        document.getElementById(
            "password"
        ).value = "";


        document.getElementById(
            "passwordGroup"
        ).style.display =
            "none";


        document.getElementById(
            "password"
        ).required =
            false;


        // ==============================================
        // SHOW FORM
        // ==============================================

        document.getElementById(
            "userFormSection"
        ).style.display =
            "block";


        document.getElementById(
            "userFormSection"
        ).scrollIntoView({
            behavior: "smooth"
        });


    } catch (error) {

        console.error(
            "Edit user error:",
            error
        );


        showMessage(
            error.message,
            "error"
        );
    }
}


// =====================================================
// DELETE USER
// =====================================================

async function deleteUser(id) {

    const currentUser =
        getCurrentUser();


    // ==============================================
    // PREVENT ADMIN DELETE OWN ACCOUNT
    // ==============================================

    if (
        currentUser &&
        Number(
            currentUser.user_id
        ) === Number(id)
    ) {

        alert(
            "You cannot delete your own admin account."
        );

        return;
    }


    // ==============================================
    // CONFIRM DELETE
    // ==============================================

    const confirmation =
        confirm(
            "Are you sure you want to delete this user?"
        );


    if (!confirmation) {
        return;
    }


    try {

        const response =
            await fetch(

                API_URL +
                "?id=" +
                encodeURIComponent(id),

                {
                    method:
                        "DELETE",

                    headers:
                        getAuthHeaders()
                }
            );


        // ==============================================
        // JWT CHECK
        // ==============================================

        if (
            handleUnauthorized(
                response
            )
        ) {
            return;
        }


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Failed to delete user"
            );
        }


        showMessage(
            "User deleted successfully.",
            "success"
        );


        await loadUsers();


    } catch (error) {

        console.error(
            "Delete user error:",
            error
        );


        showMessage(
            error.message,
            "error"
        );
    }
}


// =====================================================
// DISPLAY MESSAGE
// =====================================================

function showMessage(
    message,
    type
) {

    const box =
        document.getElementById(
            "messageBox"
        );


    if (!box) {

        if (type === "error") {
            alert(message);
        }

        return;
    }


    box.style.display =
        "block";

    box.textContent =
        message;

    box.style.padding =
        "12px";

    box.style.marginBottom =
        "20px";

    box.style.borderRadius =
        "6px";

    box.style.textAlign =
        "center";

    box.style.fontWeight =
        "600";


    // ==============================================
    // SUCCESS
    // ==============================================

    if (type === "success") {

        box.style.background =
            "#e2f5e8";

        box.style.color =
            "#167c35";

        box.style.border =
            "1px solid #bfe5ca";

    }

    // ==============================================
    // ERROR
    // ==============================================

    else {

        box.style.background =
            "#fde8e8";

        box.style.color =
            "#d92d20";

        box.style.border =
            "1px solid #f7c7c7";
    }


    setTimeout(
        function () {

            box.style.display =
                "none";

        },
        4000
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
        "loggedInUser"
    );


    window.location.href =
        "login.html";
}


// =====================================================
// SECURITY - ESCAPE HTML
// =====================================================

function escapeHTML(value) {

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