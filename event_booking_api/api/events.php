<?php

// =====================================================
// EVENTS API
// =====================================================

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header(
    "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS"
);
header(
    "Access-Control-Allow-Headers: Content-Type, Authorization, X-User-ID, X-User-Role"
);

// =====================================================
// PREFLIGHT
// =====================================================

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// =====================================================
// FILES
// =====================================================

require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../middleware/auth_middleware.php";

// =====================================================
// DATABASE CONNECTION
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

$method = $_SERVER["REQUEST_METHOD"];

// =====================================================
// RESPONSE HELPER
// =====================================================

function sendResponse(
    $statusCode,
    $success,
    $message = null,
    $data = null
) {
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

    echo json_encode(
        $response,
        JSON_PRETTY_PRINT
    );

    exit;
}

// =====================================================
// EVENT STATUS VALIDATION
// =====================================================

function isValidEventStatus($status)
{
    $allowedStatuses = [
        "upcoming",
        "ongoing",
        "completed",
        "cancelled"
    ];

    return in_array(
        strtolower($status),
        $allowedStatuses,
        true
    );
}

// =====================================================
// ORGANISER EXISTS
// =====================================================

function organiserExists($db, $organiserId)
{
    $query = "
        SELECT user_id
        FROM users
        WHERE user_id = :organiser_id
        AND role = 'organiser'
        LIMIT 1
    ";

    $stmt = $db->prepare($query);

    $stmt->bindValue(
        ":organiser_id",
        $organiserId,
        PDO::PARAM_INT
    );

    $stmt->execute();

    return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
}

// =====================================================
// VENUE EXISTS
// =====================================================

function venueExists($db, $venueId)
{
    $query = "
        SELECT venue_id
        FROM venues
        WHERE venue_id = :venue_id
        LIMIT 1
    ";

    $stmt = $db->prepare($query);

    $stmt->bindValue(
        ":venue_id",
        $venueId,
        PDO::PARAM_INT
    );

    $stmt->execute();

    return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
}

// =====================================================
// GET
// Public read access
// =====================================================

if ($method === "GET") {

    try {

        // =================================================
        // GET SINGLE EVENT
        // =================================================

        if (isset($_GET["id"])) {

            $eventId = filter_var(
                $_GET["id"],
                FILTER_VALIDATE_INT
            );

            if ($eventId === false || $eventId <= 0) {
                sendResponse(
                    400,
                    false,
                    "Invalid event ID"
                );
            }

            $query = "
                SELECT
                    e.event_id,
                    e.event_name,
                    e.description,
                    e.event_date,
                    e.event_time,
                    e.ticket_price,
                    e.total_tickets,
                    e.available_tickets,
                    e.status,
                    e.organiser_id,
                    u.name AS organiser_name,
                    e.venue_id,
                    v.venue_name,
                    v.location,
                    v.capacity
                FROM events e
                LEFT JOIN users u
                    ON e.organiser_id = u.user_id
                LEFT JOIN venues v
                    ON e.venue_id = v.venue_id
                WHERE e.event_id = :event_id
                LIMIT 1
            ";

            $stmt = $db->prepare($query);

            $stmt->bindValue(
                ":event_id",
                $eventId,
                PDO::PARAM_INT
            );

            $stmt->execute();

            $event = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$event) {
                sendResponse(
                    404,
                    false,
                    "Event not found"
                );
            }

            sendResponse(
                200,
                true,
                null,
                $event
            );
        }

        // =================================================
        // FILTERS + SEARCH
        // =================================================

        $conditions = [];
        $params = [];

        // STATUS FILTER

        if (
            isset($_GET["status"]) &&
            trim($_GET["status"]) !== ""
        ) {

            $status = strtolower(
                trim($_GET["status"])
            );

            if (!isValidEventStatus($status)) {
                sendResponse(
                    400,
                    false,
                    "Invalid event status"
                );
            }

            $conditions[] = "e.status = :status";
            $params[":status"] = $status;
        }

        // VENUE FILTER

        if (
            isset($_GET["venue_id"]) &&
            trim($_GET["venue_id"]) !== ""
        ) {

            $venueId = filter_var(
                $_GET["venue_id"],
                FILTER_VALIDATE_INT
            );

            if ($venueId === false || $venueId <= 0) {
                sendResponse(
                    400,
                    false,
                    "Invalid venue ID"
                );
            }

            $conditions[] = "e.venue_id = :venue_id";
            $params[":venue_id"] = $venueId;
        }

        // ORGANISER FILTER

        if (
            isset($_GET["organiser_id"]) &&
            trim($_GET["organiser_id"]) !== ""
        ) {

            $organiserId = filter_var(
                $_GET["organiser_id"],
                FILTER_VALIDATE_INT
            );

            if (
                $organiserId === false ||
                $organiserId <= 0
            ) {
                sendResponse(
                    400,
                    false,
                    "Invalid organiser ID"
                );
            }

            $conditions[] =
                "e.organiser_id = :organiser_id";

            $params[":organiser_id"] =
                $organiserId;
        }

        // SEARCH

        if (
            isset($_GET["search"]) &&
            trim($_GET["search"]) !== ""
        ) {

            $search = trim($_GET["search"]);

            $conditions[] = "
                (
                    e.event_name LIKE :search
                    OR
                    e.description LIKE :search
                    OR
                    v.venue_name LIKE :search
                    OR
                    v.location LIKE :search
                )
            ";

            $params[":search"] =
                "%" . $search . "%";
        }

        // =================================================
        // MAIN GET QUERY
        // =================================================

        $query = "
            SELECT
                e.event_id,
                e.event_name,
                e.description,
                e.event_date,
                e.event_time,
                e.ticket_price,
                e.total_tickets,
                e.available_tickets,
                e.status,
                e.organiser_id,
                u.name AS organiser_name,
                e.venue_id,
                v.venue_name,
                v.location,
                v.capacity
            FROM events e
            LEFT JOIN users u
                ON e.organiser_id = u.user_id
            LEFT JOIN venues v
                ON e.venue_id = v.venue_id
        ";

        if (!empty($conditions)) {
            $query .=
                " WHERE " .
                implode(" AND ", $conditions);
        }

        $query .= "
            ORDER BY
                e.event_date ASC,
                e.event_time ASC
        ";

        $stmt = $db->prepare($query);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();

        $events = $stmt->fetchAll(
            PDO::FETCH_ASSOC
        );

        http_response_code(200);

        echo json_encode(
            [
                "success" => true,
                "count" => count($events),
                "data" => $events
            ],
            JSON_PRETTY_PRINT
        );

        exit;

    } catch (PDOException $e) {

        sendResponse(
            500,
            false,
            "Failed to retrieve events"
        );
    }
}

// =====================================================
// POST
// Admin + Organiser
// =====================================================

if ($method === "POST") {

    $currentUser = requireRole([
        "admin",
        "organiser"
    ]);

    try {

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

        $requiredFields = [
            "organiser_id",
            "venue_id",
            "event_name",
            "event_date",
            "event_time",
            "ticket_price",
            "total_tickets"
        ];

        foreach ($requiredFields as $field) {

            if (
                !isset($data[$field]) ||
                trim((string)$data[$field]) === ""
            ) {
                sendResponse(
                    400,
                    false,
                    $field . " is required"
                );
            }
        }

        $organiserId = filter_var(
            $data["organiser_id"],
            FILTER_VALIDATE_INT
        );

        $venueId = filter_var(
            $data["venue_id"],
            FILTER_VALIDATE_INT
        );

        $totalTickets = filter_var(
            $data["total_tickets"],
            FILTER_VALIDATE_INT
        );

        $ticketPrice = filter_var(
            $data["ticket_price"],
            FILTER_VALIDATE_FLOAT
        );

        if (
            $organiserId === false ||
            $organiserId <= 0
        ) {
            sendResponse(
                400,
                false,
                "Invalid organiser ID"
            );
        }

        if (
            $venueId === false ||
            $venueId <= 0
        ) {
            sendResponse(
                400,
                false,
                "Invalid venue ID"
            );
        }

        if (
            $totalTickets === false ||
            $totalTickets <= 0
        ) {
            sendResponse(
                400,
                false,
                "Total tickets must be greater than 0"
            );
        }

        if (
            $ticketPrice === false ||
            $ticketPrice < 0
        ) {
            sendResponse(
                400,
                false,
                "Invalid ticket price"
            );
        }

        // Organiser can only create event under own ID

        if (
            $currentUser["role"] === "organiser" &&
            $organiserId !== (int)$currentUser["user_id"]
        ) {
            sendResponse(
                403,
                false,
                "Organiser can only create their own events"
            );
        }

        if (!organiserExists($db, $organiserId)) {
            sendResponse(
                400,
                false,
                "Organiser does not exist"
            );
        }

        if (!venueExists($db, $venueId)) {
            sendResponse(
                400,
                false,
                "Venue does not exist"
            );
        }

        $eventName =
            trim($data["event_name"]);

        if ($eventName === "") {
            sendResponse(
                400,
                false,
                "Event name cannot be empty"
            );
        }

        $description =
            isset($data["description"])
                ? trim((string)$data["description"])
                : null;

        $status =
            isset($data["status"])
                ? strtolower(trim($data["status"]))
                : "upcoming";

        if (!isValidEventStatus($status)) {
            sendResponse(
                400,
                false,
                "Invalid event status"
            );
        }

        $query = "
            INSERT INTO events
            (
                organiser_id,
                venue_id,
                event_name,
                description,
                event_date,
                event_time,
                ticket_price,
                total_tickets,
                available_tickets,
                status
            )
            VALUES
            (
                :organiser_id,
                :venue_id,
                :event_name,
                :description,
                :event_date,
                :event_time,
                :ticket_price,
                :total_tickets,
                :available_tickets,
                :status
            )
        ";

        $stmt = $db->prepare($query);

        $stmt->execute([
            ":organiser_id" => $organiserId,
            ":venue_id" => $venueId,
            ":event_name" => $eventName,
            ":description" => $description,
            ":event_date" => $data["event_date"],
            ":event_time" => $data["event_time"],
            ":ticket_price" => $ticketPrice,
            ":total_tickets" => $totalTickets,
            ":available_tickets" => $totalTickets,
            ":status" => $status
        ]);

        sendResponse(
            201,
            true,
            "Event created successfully",
            [
                "event_id" =>
                    (int)$db->lastInsertId()
            ]
        );

    } catch (PDOException $e) {

        sendResponse(
            500,
            false,
            "Failed to create event"
        );
    }
}

// =====================================================
// PUT
// Admin + Organiser
// =====================================================

if ($method === "PUT") {

    $currentUser = requireRole([
        "admin",
        "organiser"
    ]);

    try {

        if (!isset($_GET["id"])) {
            sendResponse(
                400,
                false,
                "Event ID is required"
            );
        }

        $eventId = filter_var(
            $_GET["id"],
            FILTER_VALIDATE_INT
        );

        if (
            $eventId === false ||
            $eventId <= 0
        ) {
            sendResponse(
                400,
                false,
                "Invalid event ID"
            );
        }

        $checkQuery = "
            SELECT *
            FROM events
            WHERE event_id = :event_id
            LIMIT 1
        ";

        $checkStmt =
            $db->prepare($checkQuery);

        $checkStmt->execute([
            ":event_id" => $eventId
        ]);

        $existingEvent =
            $checkStmt->fetch(
                PDO::FETCH_ASSOC
            );

        if (!$existingEvent) {
            sendResponse(
                404,
                false,
                "Event not found"
            );
        }

        // Organiser can only edit own event

        if (
            $currentUser["role"] === "organiser" &&
            (int)$existingEvent["organiser_id"] !==
            (int)$currentUser["user_id"]
        ) {
            sendResponse(
                403,
                false,
                "You can only update your own events"
            );
        }

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

        $organiserId =
            isset($data["organiser_id"])
                ? filter_var(
                    $data["organiser_id"],
                    FILTER_VALIDATE_INT
                )
                : (int)$existingEvent["organiser_id"];

        if (
            $organiserId === false ||
            $organiserId <= 0
        ) {
            sendResponse(
                400,
                false,
                "Invalid organiser ID"
            );
        }

        // Organiser cannot transfer event to another organiser

        if (
            $currentUser["role"] === "organiser" &&
            (int)$organiserId !==
            (int)$currentUser["user_id"]
        ) {
            sendResponse(
                403,
                false,
                "Organiser cannot transfer event ownership"
            );
        }

        $venueId =
            isset($data["venue_id"])
                ? filter_var(
                    $data["venue_id"],
                    FILTER_VALIDATE_INT
                )
                : (int)$existingEvent["venue_id"];

        if (
            $venueId === false ||
            $venueId <= 0
        ) {
            sendResponse(
                400,
                false,
                "Invalid venue ID"
            );
        }

        if (!organiserExists($db, $organiserId)) {
            sendResponse(
                400,
                false,
                "Organiser does not exist"
            );
        }

        if (!venueExists($db, $venueId)) {
            sendResponse(
                400,
                false,
                "Venue does not exist"
            );
        }

        $eventName =
            isset($data["event_name"])
                ? trim($data["event_name"])
                : $existingEvent["event_name"];

        if ($eventName === "") {
            sendResponse(
                400,
                false,
                "Event name cannot be empty"
            );
        }

        $description =
            array_key_exists(
                "description",
                $data
            )
                ? trim(
                    (string)$data["description"]
                )
                : $existingEvent["description"];

        $eventDate =
            $data["event_date"]
            ?? $existingEvent["event_date"];

        $eventTime =
            $data["event_time"]
            ?? $existingEvent["event_time"];

        $ticketPrice =
            isset($data["ticket_price"])
                ? filter_var(
                    $data["ticket_price"],
                    FILTER_VALIDATE_FLOAT
                )
                : (float)$existingEvent["ticket_price"];

        if (
            $ticketPrice === false ||
            $ticketPrice < 0
        ) {
            sendResponse(
                400,
                false,
                "Ticket price cannot be negative"
            );
        }

        $totalTickets =
            isset($data["total_tickets"])
                ? filter_var(
                    $data["total_tickets"],
                    FILTER_VALIDATE_INT
                )
                : (int)$existingEvent["total_tickets"];

        if (
            $totalTickets === false ||
            $totalTickets <= 0
        ) {
            sendResponse(
                400,
                false,
                "Total tickets must be greater than 0"
            );
        }

        $availableTickets =
            isset($data["available_tickets"])
                ? filter_var(
                    $data["available_tickets"],
                    FILTER_VALIDATE_INT
                )
                : (int)$existingEvent["available_tickets"];

        if (
            $availableTickets === false ||
            $availableTickets < 0 ||
            $availableTickets > $totalTickets
        ) {
            sendResponse(
                400,
                false,
                "Available tickets must be between 0 and total tickets"
            );
        }

        $status =
            isset($data["status"])
                ? strtolower(
                    trim($data["status"])
                )
                : $existingEvent["status"];

        if (!isValidEventStatus($status)) {
            sendResponse(
                400,
                false,
                "Invalid event status"
            );
        }

        $query = "
            UPDATE events
            SET
                organiser_id = :organiser_id,
                venue_id = :venue_id,
                event_name = :event_name,
                description = :description,
                event_date = :event_date,
                event_time = :event_time,
                ticket_price = :ticket_price,
                total_tickets = :total_tickets,
                available_tickets = :available_tickets,
                status = :status
            WHERE event_id = :event_id
        ";

        $stmt = $db->prepare($query);

        $stmt->execute([
            ":organiser_id" => $organiserId,
            ":venue_id" => $venueId,
            ":event_name" => $eventName,
            ":description" => $description,
            ":event_date" => $eventDate,
            ":event_time" => $eventTime,
            ":ticket_price" => $ticketPrice,
            ":total_tickets" => $totalTickets,
            ":available_tickets" => $availableTickets,
            ":status" => $status,
            ":event_id" => $eventId
        ]);

        sendResponse(
            200,
            true,
            "Event updated successfully"
        );

    } catch (PDOException $e) {

        sendResponse(
            500,
            false,
            "Failed to update event"
        );
    }
}

// =====================================================
// DELETE
// Admin + Organiser
// =====================================================

if ($method === "DELETE") {

    $currentUser = requireRole([
        "admin",
        "organiser"
    ]);

    try {

        if (!isset($_GET["id"])) {
            sendResponse(
                400,
                false,
                "Event ID is required"
            );
        }

        $eventId = filter_var(
            $_GET["id"],
            FILTER_VALIDATE_INT
        );

        if (
            $eventId === false ||
            $eventId <= 0
        ) {
            sendResponse(
                400,
                false,
                "Invalid event ID"
            );
        }

        $checkQuery = "
            SELECT
                event_id,
                organiser_id
            FROM events
            WHERE event_id = :event_id
            LIMIT 1
        ";

        $checkStmt =
            $db->prepare($checkQuery);

        $checkStmt->execute([
            ":event_id" => $eventId
        ]);

        $existingEvent =
            $checkStmt->fetch(
                PDO::FETCH_ASSOC
            );

        if (!$existingEvent) {
            sendResponse(
                404,
                false,
                "Event not found"
            );
        }

        // Organiser can only delete own event

        if (
            $currentUser["role"] === "organiser" &&
            (int)$existingEvent["organiser_id"] !==
            (int)$currentUser["user_id"]
        ) {
            sendResponse(
                403,
                false,
                "You can only delete your own events"
            );
        }

        // Check existing bookings

        $bookingQuery = "
            SELECT COUNT(*) AS total
            FROM bookings
            WHERE event_id = :event_id
        ";

        $bookingStmt =
            $db->prepare($bookingQuery);

        $bookingStmt->execute([
            ":event_id" => $eventId
        ]);

        $bookingResult =
            $bookingStmt->fetch(
                PDO::FETCH_ASSOC
            );

        if (
            (int)$bookingResult["total"] > 0
        ) {
            sendResponse(
                409,
                false,
                "Cannot delete event because bookings exist for this event"
            );
        }

        $deleteQuery = "
            DELETE FROM events
            WHERE event_id = :event_id
        ";

        $deleteStmt =
            $db->prepare($deleteQuery);

        $deleteStmt->execute([
            ":event_id" => $eventId
        ]);

        sendResponse(
            200,
            true,
            "Event deleted successfully"
        );

    } catch (PDOException $e) {

        sendResponse(
            500,
            false,
            "Failed to delete event"
        );
    }
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