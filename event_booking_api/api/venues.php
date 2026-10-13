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
// GET - RETRIEVE VENUES
// ADMIN / ORGANISER / CUSTOMER
// =====================================================

if ($method === "GET") {

    // Authentication required
    $currentUser = requireAuth();


    // -------------------------------------------------
    // GET SINGLE VENUE
    // Example: venues.php?id=1
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
                "Invalid venue ID"
            );
        }


        $stmt = $db->prepare("
            SELECT
                venue_id,
                venue_name,
                location,
                capacity,
                created_at
            FROM venues
            WHERE venue_id = ?
        ");

        $stmt->execute([$id]);

        $venue = $stmt->fetch(PDO::FETCH_ASSOC);


        if (!$venue) {

            sendResponse(
                404,
                false,
                "Venue not found"
            );
        }


        sendResponse(
            200,
            true,
            null,
            $venue
        );
    }


    // -------------------------------------------------
    // GET ALL VENUES
    // -------------------------------------------------

    $stmt = $db->prepare("
        SELECT
            venue_id,
            venue_name,
            location,
            capacity,
            created_at
        FROM venues
        ORDER BY venue_id ASC
    ");

    $stmt->execute();

    $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);


    http_response_code(200);

    echo json_encode([
        "success" => true,
        "count" => count($venues),
        "data" => $venues
    ]);

    exit;
}


// =====================================================
// POST - CREATE NEW VENUE
// ADMIN ONLY
// =====================================================

if ($method === "POST") {

    // Admin only
    $currentUser = requireRole("admin");


    // -------------------------------------------------
    // READ JSON BODY
    // -------------------------------------------------

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
            $data["venue_name"],
            $data["location"],
            $data["capacity"]
        ) ||
        trim((string)$data["venue_name"]) === "" ||
        trim((string)$data["location"]) === ""
    ) {

        sendResponse(
            400,
            false,
            "Venue name, location and capacity are required"
        );
    }


    // -------------------------------------------------
    // CLEAN INPUT
    // -------------------------------------------------

    $venue_name = trim($data["venue_name"]);
    $location = trim($data["location"]);

    $capacity = filter_var(
        $data["capacity"],
        FILTER_VALIDATE_INT
    );


    // -------------------------------------------------
    // VALIDATE CAPACITY
    // -------------------------------------------------

    if ($capacity === false || $capacity <= 0) {

        sendResponse(
            400,
            false,
            "Invalid capacity"
        );
    }


    // -------------------------------------------------
    // CREATE VENUE
    // -------------------------------------------------

    try {

        $stmt = $db->prepare("
            INSERT INTO venues
            (
                venue_name,
                location,
                capacity
            )
            VALUES (?, ?, ?)
        ");


        $stmt->execute([
            $venue_name,
            $location,
            $capacity
        ]);


        $venue_id = (int)$db->lastInsertId();


        http_response_code(201);

        echo json_encode([
            "success" => true,
            "message" => "Venue created successfully",
            "data" => [
                "venue_id" => $venue_id,
                "venue_name" => $venue_name,
                "location" => $location,
                "capacity" => (int)$capacity
            ]
        ]);

    } catch (PDOException $e) {

        sendResponse(
            500,
            false,
            "Failed to create venue"
        );
    }

    exit;
}


// =====================================================
// PUT - UPDATE VENUE
// ADMIN ONLY
// =====================================================

if ($method === "PUT") {

    // Admin only
    $currentUser = requireRole("admin");


    // -------------------------------------------------
    // VENUE ID REQUIRED
    // -------------------------------------------------

    if (!isset($_GET["id"])) {

        sendResponse(
            400,
            false,
            "Venue ID is required"
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
            "Invalid venue ID"
        );
    }


    // -------------------------------------------------
    // CHECK VENUE EXISTS
    // -------------------------------------------------

    $check = $db->prepare("
        SELECT venue_id
        FROM venues
        WHERE venue_id = ?
    ");

    $check->execute([$id]);


    if (!$check->fetch()) {

        sendResponse(
            404,
            false,
            "Venue not found"
        );
    }


    // -------------------------------------------------
    // READ JSON BODY
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
            $data["venue_name"],
            $data["location"],
            $data["capacity"]
        ) ||
        trim((string)$data["venue_name"]) === "" ||
        trim((string)$data["location"]) === ""
    ) {

        sendResponse(
            400,
            false,
            "Venue name, location and capacity are required"
        );
    }


    // -------------------------------------------------
    // CLEAN INPUT
    // -------------------------------------------------

    $venue_name = trim($data["venue_name"]);
    $location = trim($data["location"]);

    $capacity = filter_var(
        $data["capacity"],
        FILTER_VALIDATE_INT
    );


    // -------------------------------------------------
    // VALIDATE CAPACITY
    // -------------------------------------------------

    if ($capacity === false || $capacity <= 0) {

        sendResponse(
            400,
            false,
            "Invalid capacity"
        );
    }


    // -------------------------------------------------
    // UPDATE VENUE
    // -------------------------------------------------

    try {

        $stmt = $db->prepare("
            UPDATE venues
            SET
                venue_name = ?,
                location = ?,
                capacity = ?
            WHERE venue_id = ?
        ");


        $stmt->execute([
            $venue_name,
            $location,
            $capacity,
            $id
        ]);


        http_response_code(200);

        echo json_encode([
            "success" => true,
            "message" => "Venue updated successfully",
            "data" => [
                "venue_id" => (int)$id,
                "venue_name" => $venue_name,
                "location" => $location,
                "capacity" => (int)$capacity
            ]
        ]);

    } catch (PDOException $e) {

        sendResponse(
            500,
            false,
            "Failed to update venue"
        );
    }

    exit;
}


// =====================================================
// DELETE - DELETE VENUE
// ADMIN ONLY
// =====================================================

if ($method === "DELETE") {

    // Admin only
    $currentUser = requireRole("admin");


    // -------------------------------------------------
    // VENUE ID REQUIRED
    // -------------------------------------------------

    if (!isset($_GET["id"])) {

        sendResponse(
            400,
            false,
            "Venue ID is required"
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
            "Invalid venue ID"
        );
    }


    // -------------------------------------------------
    // CHECK VENUE EXISTS
    // -------------------------------------------------

    $check = $db->prepare("
        SELECT
            venue_id,
            venue_name,
            location,
            capacity
        FROM venues
        WHERE venue_id = ?
    ");

    $check->execute([$id]);

    $venue = $check->fetch(PDO::FETCH_ASSOC);


    if (!$venue) {

        sendResponse(
            404,
            false,
            "Venue not found"
        );
    }


    // -------------------------------------------------
    // DELETE VENUE
    // -------------------------------------------------

    try {

        $stmt = $db->prepare("
            DELETE FROM venues
            WHERE venue_id = ?
        ");

        $stmt->execute([$id]);


        http_response_code(200);

        echo json_encode([
            "success" => true,
            "message" => "Venue deleted successfully",
            "data" => [
                "venue_id" => (int)$id,
                "venue_name" => $venue["venue_name"],
                "location" => $venue["location"],
                "capacity" => (int)$venue["capacity"]
            ]
        ]);

    } catch (PDOException $e) {

        sendResponse(
            409,
            false,
            "Venue cannot be deleted because it is being used by an event"
        );
    }

    exit;
}


// =====================================================
// METHOD NOT ALLOWED
// =====================================================

sendResponse(
    405,
    false,
    "Method not allowed"
);

?>