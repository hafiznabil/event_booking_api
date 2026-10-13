<?php

// =====================================================
// HEADERS
// =====================================================

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header(
    "Access-Control-Allow-Headers: Content-Type, Authorization, X-User-ID, X-User-Role"
);


// =====================================================
// HANDLE PREFLIGHT REQUEST
// =====================================================

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}


// =====================================================
// DATABASE CONNECTION
// =====================================================

require_once __DIR__ . "/../config/database.php";


// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

require_once __DIR__ . "/../middleware/auth_middleware.php";


// =====================================================
// CONNECT DATABASE
// =====================================================

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Database connection failed"
    ]);

    exit;
}


// =====================================================
// REQUEST METHOD
// =====================================================

$method = $_SERVER["REQUEST_METHOD"];


// =====================================================
// ALL USER MANAGEMENT REQUIRES ADMIN ROLE
// =====================================================

$currentUser = requireRole("admin");


// =====================================================
// HELPER FUNCTION
// =====================================================

function sendResponse($statusCode, $success, $message = null, $data = null)
{
    http_response_code($statusCode);

    $response = [
        "success" => $success
    ];

    if ($message !== null) {
        $response["message"] = $message;
    }

    if ($data !== null) {
        $response["data"] = $data;
    }

    echo json_encode($response);
    exit;
}


// =====================================================
// GET - RETRIEVE USERS
// ADMIN ONLY
// =====================================================

if ($method === "GET") {

    // -------------------------------------------------
    // GET SINGLE USER
    // Example:
    // users.php?id=4
    // -------------------------------------------------

    if (isset($_GET["id"])) {

        $id = filter_var(
            $_GET["id"],
            FILTER_VALIDATE_INT
        );

        if ($id === false || $id <= 0) {
            sendResponse(
                400,
                false,
                "Invalid user ID"
            );
        }


        $stmt = $db->prepare("
            SELECT
                user_id,
                name,
                email,
                role,
                created_at
            FROM users
            WHERE user_id = ?
        ");

        $stmt->execute([$id]);

        $user = $stmt->fetch(PDO::FETCH_ASSOC);


        if (!$user) {
            sendResponse(
                404,
                false,
                "User not found"
            );
        }


        sendResponse(
            200,
            true,
            null,
            $user
        );
    }


    // -------------------------------------------------
    // GET ALL USERS
    // -------------------------------------------------

    $stmt = $db->query("
        SELECT
            user_id,
            name,
            email,
            role,
            created_at
        FROM users
        ORDER BY user_id ASC
    ");

    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);


    http_response_code(200);

    echo json_encode([
        "success" => true,
        "count" => count($users),
        "data" => $users
    ]);

    exit;
}


// =====================================================
// POST - CREATE NEW USER
// ADMIN ONLY
// =====================================================

if ($method === "POST") {

    $data = json_decode(
        file_get_contents("php://input"),
        true
    );


    // -------------------------------------------------
    // INVALID JSON
    // -------------------------------------------------

    if (!is_array($data)) {
        sendResponse(
            400,
            false,
            "Invalid JSON body"
        );
    }


    // -------------------------------------------------
    // REQUIRED FIELDS
    // -------------------------------------------------

    if (
        !isset(
            $data["name"],
            $data["email"],
            $data["password"],
            $data["role"]
        ) ||
        trim((string)$data["name"]) === "" ||
        trim((string)$data["email"]) === "" ||
        trim((string)$data["password"]) === "" ||
        trim((string)$data["role"]) === ""
    ) {

        sendResponse(
            400,
            false,
            "Name, email, password and role are required"
        );
    }


    // -------------------------------------------------
    // CLEAN INPUT
    // -------------------------------------------------

    $name = trim($data["name"]);

    $email = strtolower(
        trim($data["email"])
    );

    $password = (string)$data["password"];

    $role = strtolower(
        trim($data["role"])
    );


    // -------------------------------------------------
    // VALIDATE EMAIL
    // -------------------------------------------------

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {

        sendResponse(
            400,
            false,
            "Invalid email format"
        );
    }


    // -------------------------------------------------
    // VALIDATE PASSWORD
    // -------------------------------------------------

    if (strlen($password) < 6) {

        sendResponse(
            400,
            false,
            "Password must be at least 6 characters"
        );
    }


    // -------------------------------------------------
    // VALIDATE ROLE
    // -------------------------------------------------

    $allowedRoles = [
        "admin",
        "organiser",
        "customer"
    ];


    if (!in_array($role, $allowedRoles, true)) {

        sendResponse(
            400,
            false,
            "Invalid role. Allowed roles: admin, organiser, customer"
        );
    }


    // -------------------------------------------------
    // CHECK DUPLICATE EMAIL
    // -------------------------------------------------

    $check = $db->prepare("
        SELECT user_id
        FROM users
        WHERE email = ?
    ");

    $check->execute([$email]);


    if ($check->fetch()) {

        sendResponse(
            409,
            false,
            "Email already exists"
        );
    }


    // -------------------------------------------------
    // HASH PASSWORD
    // -------------------------------------------------

    $hashedPassword = password_hash(
        $password,
        PASSWORD_DEFAULT
    );


    // -------------------------------------------------
    // INSERT USER
    // -------------------------------------------------

    try {

        $stmt = $db->prepare("
            INSERT INTO users
            (
                name,
                email,
                password,
                role
            )
            VALUES (?, ?, ?, ?)
        ");


        $stmt->execute([
            $name,
            $email,
            $hashedPassword,
            $role
        ]);


        http_response_code(201);

        echo json_encode([
            "success" => true,
            "message" => "User created successfully",
            "data" => [
                "user_id" => (int)$db->lastInsertId(),
                "name" => $name,
                "email" => $email,
                "role" => $role
            ]
        ]);

    } catch (PDOException $e) {

        sendResponse(
            500,
            false,
            "Failed to create user"
        );
    }

    exit;
}


// =====================================================
// PUT - UPDATE USER
// ADMIN ONLY
// =====================================================

if ($method === "PUT") {

    // -------------------------------------------------
    // USER ID REQUIRED
    // -------------------------------------------------

    if (!isset($_GET["id"])) {

        sendResponse(
            400,
            false,
            "User ID is required"
        );
    }


    $id = filter_var(
        $_GET["id"],
        FILTER_VALIDATE_INT
    );


    if ($id === false || $id <= 0) {

        sendResponse(
            400,
            false,
            "Invalid user ID"
        );
    }


    // -------------------------------------------------
    // CHECK USER EXISTS
    // -------------------------------------------------

    $check = $db->prepare("
        SELECT user_id
        FROM users
        WHERE user_id = ?
    ");

    $check->execute([$id]);


    if (!$check->fetch()) {

        sendResponse(
            404,
            false,
            "User not found"
        );
    }


    // -------------------------------------------------
    // READ JSON
    // -------------------------------------------------

    $data = json_decode(
        file_get_contents("php://input"),
        true
    );


    if (!is_array($data)) {

        sendResponse(
            400,
            false,
            "Invalid JSON body"
        );
    }


    // -------------------------------------------------
    // REQUIRED FIELDS
    // -------------------------------------------------

    if (
        !isset(
            $data["name"],
            $data["email"],
            $data["role"]
        ) ||
        trim((string)$data["name"]) === "" ||
        trim((string)$data["email"]) === "" ||
        trim((string)$data["role"]) === ""
    ) {

        sendResponse(
            400,
            false,
            "Name, email and role are required"
        );
    }


    // -------------------------------------------------
    // CLEAN INPUT
    // -------------------------------------------------

    $name = trim($data["name"]);

    $email = strtolower(
        trim($data["email"])
    );

    $role = strtolower(
        trim($data["role"])
    );


    // -------------------------------------------------
    // VALIDATE EMAIL
    // -------------------------------------------------

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {

        sendResponse(
            400,
            false,
            "Invalid email format"
        );
    }


    // -------------------------------------------------
    // VALIDATE ROLE
    // -------------------------------------------------

    $allowedRoles = [
        "admin",
        "organiser",
        "customer"
    ];


    if (!in_array($role, $allowedRoles, true)) {

        sendResponse(
            400,
            false,
            "Invalid role. Allowed roles: admin, organiser, customer"
        );
    }


    // -------------------------------------------------
    // CHECK DUPLICATE EMAIL
    // -------------------------------------------------

    $duplicate = $db->prepare("
        SELECT user_id
        FROM users
        WHERE email = ?
        AND user_id != ?
    ");

    $duplicate->execute([
        $email,
        $id
    ]);


    if ($duplicate->fetch()) {

        sendResponse(
            409,
            false,
            "Email already exists"
        );
    }


    // -------------------------------------------------
    // UPDATE WITH OPTIONAL PASSWORD
    // -------------------------------------------------

    try {

        if (
            isset($data["password"]) &&
            trim((string)$data["password"]) !== ""
        ) {

            $password = (string)$data["password"];


            if (strlen($password) < 6) {

                sendResponse(
                    400,
                    false,
                    "Password must be at least 6 characters"
                );
            }


            $hashedPassword = password_hash(
                $password,
                PASSWORD_DEFAULT
            );


            $stmt = $db->prepare("
                UPDATE users
                SET
                    name = ?,
                    email = ?,
                    password = ?,
                    role = ?
                WHERE user_id = ?
            ");


            $stmt->execute([
                $name,
                $email,
                $hashedPassword,
                $role,
                $id
            ]);

        } else {

            $stmt = $db->prepare("
                UPDATE users
                SET
                    name = ?,
                    email = ?,
                    role = ?
                WHERE user_id = ?
            ");


            $stmt->execute([
                $name,
                $email,
                $role,
                $id
            ]);
        }


        http_response_code(200);

        echo json_encode([
            "success" => true,
            "message" => "User updated successfully",
            "data" => [
                "user_id" => (int)$id,
                "name" => $name,
                "email" => $email,
                "role" => $role
            ]
        ]);

    } catch (PDOException $e) {

        sendResponse(
            500,
            false,
            "Failed to update user"
        );
    }

    exit;
}


// =====================================================
// DELETE - DELETE USER
// ADMIN ONLY
// =====================================================

if ($method === "DELETE") {

    // -------------------------------------------------
    // USER ID REQUIRED
    // -------------------------------------------------

    if (!isset($_GET["id"])) {

        sendResponse(
            400,
            false,
            "User ID is required"
        );
    }


    $id = filter_var(
        $_GET["id"],
        FILTER_VALIDATE_INT
    );


    if ($id === false || $id <= 0) {

        sendResponse(
            400,
            false,
            "Invalid user ID"
        );
    }


    // -------------------------------------------------
    // PREVENT ADMIN FROM DELETING OWN ACCOUNT
    // -------------------------------------------------

    if ((int)$currentUser["user_id"] === (int)$id) {

        sendResponse(
            403,
            false,
            "You cannot delete your own admin account"
        );
    }


    // -------------------------------------------------
    // CHECK USER EXISTS
    // -------------------------------------------------

    $check = $db->prepare("
        SELECT
            user_id,
            name,
            email,
            role
        FROM users
        WHERE user_id = ?
    ");

    $check->execute([$id]);

    $user = $check->fetch(PDO::FETCH_ASSOC);


    if (!$user) {

        sendResponse(
            404,
            false,
            "User not found"
        );
    }


    // -------------------------------------------------
    // DELETE USER
    // -------------------------------------------------

    try {

        $stmt = $db->prepare("
            DELETE FROM users
            WHERE user_id = ?
        ");

        $stmt->execute([$id]);


        http_response_code(200);

        echo json_encode([
            "success" => true,
            "message" => "User deleted successfully",
            "data" => [
                "user_id" => (int)$id,
                "name" => $user["name"],
                "email" => $user["email"],
                "role" => $user["role"]
            ]
        ]);

    } catch (PDOException $e) {

        sendResponse(
            409,
            false,
            "User cannot be deleted because related records exist"
        );
    }

    exit;
}


// =====================================================
// UNSUPPORTED HTTP METHOD
// =====================================================

sendResponse(
    405,
    false,
    "Method not allowed"
);

?>