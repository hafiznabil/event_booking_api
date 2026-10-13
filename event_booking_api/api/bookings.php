<?php

// =====================================================
// HEADERS
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
// HANDLE PREFLIGHT
// =====================================================

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}


// =====================================================
// REQUIRED FILES
// =====================================================

require_once __DIR__ . "/../config/database.php";
require_once __DIR__ . "/../middleware/auth_middleware.php";
require_once __DIR__ . "/../middleware/logger.php";

logApiRequest();

// =====================================================
// DATABASE CONNECTION
// =====================================================

$database = new Database();
$db = $database->getConnection();


// =====================================================
// HELPER FUNCTIONS
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


function getJsonBody()
{
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

    return $data;
}


function validId($value)
{
    $id = filter_var(
        $value,
        FILTER_VALIDATE_INT
    );

    return (
        $id !== false &&
        $id > 0
    )
        ? $id
        : false;
}


// =====================================================
// CHECK DATABASE CONNECTION
// =====================================================

if (!$db) {
    sendResponse(
        500,
        false,
        "Database connection failed"
    );
}


$method = $_SERVER["REQUEST_METHOD"];


// =====================================================
// GET BOOKINGS
// Admin / Organiser / Customer
// =====================================================

if ($method === "GET") {

    $currentUser = requireRole([
        "admin",
        "organiser",
        "customer"
    ]);

    try {

        // =================================================
        // GET SINGLE BOOKING
        // =================================================

        if (isset($_GET["id"])) {

            $id = validId($_GET["id"]);

            if (!$id) {
                sendResponse(
                    400,
                    false,
                    "Invalid booking ID"
                );
            }


            $stmt = $db->prepare("
                SELECT
                    b.booking_id,
                    b.customer_id,
                    u.name AS customer_name,
                    u.email AS customer_email,
                    b.event_id,
                    e.event_name,
                    e.event_date,
                    e.event_time,
                    e.ticket_price,
                    b.quantity,
                    b.total_amount,
                    b.booking_status,
                    b.booking_date
                FROM bookings b

                INNER JOIN users u
                    ON b.customer_id = u.user_id

                INNER JOIN events e
                    ON b.event_id = e.event_id

                WHERE b.booking_id = ?
            ");

            $stmt->execute([$id]);

            $booking = $stmt->fetch(
                PDO::FETCH_ASSOC
            );


            if (!$booking) {
                sendResponse(
                    404,
                    false,
                    "Booking not found"
                );
            }


            // Customer can only view own booking
            if (
                $currentUser["role"] === "customer" &&
                (int)$booking["customer_id"] !==
                (int)$currentUser["user_id"]
            ) {
                sendResponse(
                    403,
                    false,
                    "You can only view your own bookings"
                );
            }


            // Organiser can only view booking
            // for events belonging to them
            if (
                $currentUser["role"] === "organiser"
            ) {

                $check = $db->prepare("
                    SELECT event_id
                    FROM events
                    WHERE event_id = ?
                    AND organiser_id = ?
                ");

                $check->execute([
                    $booking["event_id"],
                    $currentUser["user_id"]
                ]);

                if (!$check->fetch()) {
                    sendResponse(
                        403,
                        false,
                        "You can only view bookings for your own events"
                    );
                }
            }


            sendResponse(
                200,
                true,
                null,
                $booking
            );
        }


        // =================================================
        // FILTER BOOKINGS
        // =================================================

        $conditions = [];
        $params = [];


        // =================================================
        // CUSTOMER ROLE
        // Automatically restrict to own bookings
        // =================================================

        if (
            $currentUser["role"] === "customer"
        ) {

            $conditions[] =
                "b.customer_id = ?";

            $params[] =
                $currentUser["user_id"];
        }


        // =================================================
        // ORGANISER ROLE
        // Automatically restrict to own events
        // =================================================

        if (
            $currentUser["role"] === "organiser"
        ) {

            $conditions[] =
                "e.organiser_id = ?";

            $params[] =
                $currentUser["user_id"];
        }


        // =================================================
        // CUSTOMER FILTER
        // Admin / organiser only
        // =================================================

        if (
            isset($_GET["customer_id"]) &&
            $currentUser["role"] !== "customer"
        ) {

            $customerId =
                validId(
                    $_GET["customer_id"]
                );

            if (!$customerId) {
                sendResponse(
                    400,
                    false,
                    "Invalid customer ID"
                );
            }


            $check = $db->prepare("
                SELECT user_id
                FROM users
                WHERE user_id = ?
                AND role = 'customer'
            ");

            $check->execute([
                $customerId
            ]);

            if (!$check->fetch()) {
                sendResponse(
                    404,
                    false,
                    "Customer not found"
                );
            }


            $conditions[] =
                "b.customer_id = ?";

            $params[] =
                $customerId;
        }


        // =================================================
        // EVENT FILTER
        // =================================================

        if (
            isset($_GET["event_id"])
        ) {

            $eventId =
                validId(
                    $_GET["event_id"]
                );

            if (!$eventId) {
                sendResponse(
                    400,
                    false,
                    "Invalid event ID"
                );
            }


            $check = $db->prepare("
                SELECT event_id
                FROM events
                WHERE event_id = ?
            ");

            $check->execute([
                $eventId
            ]);

            if (!$check->fetch()) {
                sendResponse(
                    404,
                    false,
                    "Event not found"
                );
            }


            $conditions[] =
                "b.event_id = ?";

            $params[] =
                $eventId;
        }


        // =================================================
        // STATUS FILTER
        // =================================================

        if (
            isset($_GET["status"])
        ) {

            $status =
                strtolower(
                    trim(
                        $_GET["status"]
                    )
                );

            $allowedStatuses = [
                "pending",
                "confirmed",
                "cancelled"
            ];

            if (
                !in_array(
                    $status,
                    $allowedStatuses,
                    true
                )
            ) {
                sendResponse(
                    400,
                    false,
                    "Invalid booking status"
                );
            }


            $conditions[] =
                "b.booking_status = ?";

            $params[] =
                $status;
        }


        // =================================================
        // BUILD QUERY
        // =================================================

        $sql = "
            SELECT
                b.booking_id,
                b.customer_id,
                u.name AS customer_name,
                u.email AS customer_email,
                b.event_id,
                e.event_name,
                e.event_date,
                e.event_time,
                e.ticket_price,
                b.quantity,
                b.total_amount,
                b.booking_status,
                b.booking_date
            FROM bookings b

            INNER JOIN users u
                ON b.customer_id = u.user_id

            INNER JOIN events e
                ON b.event_id = e.event_id
        ";


        if (!empty($conditions)) {

            $sql .=
                " WHERE " .
                implode(
                    " AND ",
                    $conditions
                );
        }


        $sql .= "
            ORDER BY b.booking_id ASC
        ";


        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        $bookings =
            $stmt->fetchAll(
                PDO::FETCH_ASSOC
            );


        http_response_code(200);

        echo json_encode([
            "success" => true,
            "count" => count($bookings),
            "data" => $bookings
        ], JSON_PRETTY_PRINT);

        exit;


    } catch (PDOException $e) {

        sendResponse(
            500,
            false,
            "Failed to retrieve bookings"
        );
    }
}


// =====================================================
// POST - CREATE BOOKING
// CUSTOMER ONLY
// customer_id is taken from authenticated user
// =====================================================

if ($method === "POST") {

    $currentUser = requireRole([
        "customer"
    ]);


    $data = getJsonBody();


    // Only event_id and quantity are required
    if (
        !isset($data["event_id"]) ||
        !isset($data["quantity"])
    ) {
        sendResponse(
            400,
            false,
            "event_id and quantity are required"
        );
    }


    // Customer ID comes from middleware
    $customerId =
        (int)$currentUser["user_id"];


    $eventId =
        validId(
            $data["event_id"]
        );


    $quantity =
        validId(
            $data["quantity"]
        );


    if (
        !$eventId ||
        !$quantity
    ) {
        sendResponse(
            400,
            false,
            "Invalid event_id or quantity"
        );
    }


    try {

        $db->beginTransaction();


        // =================================================
        // CHECK AUTHENTICATED CUSTOMER
        // =================================================

        $stmt = $db->prepare("
            SELECT user_id
            FROM users
            WHERE user_id = ?
            AND role = 'customer'
        ");

        $stmt->execute([
            $customerId
        ]);


        if (!$stmt->fetch()) {

            $db->rollBack();

            sendResponse(
                404,
                false,
                "Authenticated customer not found"
            );
        }


        // =================================================
        // GET EVENT
        // =================================================

        $stmt = $db->prepare("
            SELECT
                event_id,
                event_name,
                ticket_price,
                available_tickets,
                status
            FROM events
            WHERE event_id = ?
            FOR UPDATE
        ");


        $stmt->execute([
            $eventId
        ]);


        $event =
            $stmt->fetch(
                PDO::FETCH_ASSOC
            );


        if (!$event) {

            $db->rollBack();

            sendResponse(
                404,
                false,
                "Event not found"
            );
        }


        // =================================================
        // EVENT MUST BE UPCOMING
        // =================================================

        if (
            strtolower(
                $event["status"]
            ) !== "upcoming"
        ) {

            $db->rollBack();

            sendResponse(
                400,
                false,
                "This event is not available for booking"
            );
        }


        // =================================================
        // CHECK AVAILABLE TICKETS
        // =================================================

        if (
            $quantity >
            (int)$event["available_tickets"]
        ) {

            $db->rollBack();

            sendResponse(
                400,
                false,
                "Not enough tickets available"
            );
        }


        // =================================================
        // CALCULATE TOTAL
        // =================================================

        $totalAmount =
            (float)$event["ticket_price"]
            * $quantity;


        // =================================================
        // CREATE BOOKING
        // =================================================

        $stmt = $db->prepare("
            INSERT INTO bookings
            (
                customer_id,
                event_id,
                quantity,
                total_amount,
                booking_status
            )
            VALUES (?, ?, ?, ?, 'confirmed')
        ");


        $stmt->execute([
            $customerId,
            $eventId,
            $quantity,
            $totalAmount
        ]);


        $bookingId =
            (int)$db->lastInsertId();


        // =================================================
        // REDUCE AVAILABLE TICKETS
        // =================================================

        $stmt = $db->prepare("
            UPDATE events
            SET available_tickets =
                available_tickets - ?
            WHERE event_id = ?
        ");


        $stmt->execute([
            $quantity,
            $eventId
        ]);


        // =================================================
        // COMMIT
        // =================================================

        $db->commit();


        // =================================================
        // RESPONSE
        // =================================================

        sendResponse(
            201,
            true,
            "Booking created successfully",
            [
                "booking_id" =>
                    $bookingId,

                "customer_id" =>
                    $customerId,

                "event_id" =>
                    $eventId,

                "event_name" =>
                    $event["event_name"],

                "quantity" =>
                    $quantity,

                "ticket_price" =>
                    number_format(
                        (float)$event["ticket_price"],
                        2,
                        ".",
                        ""
                    ),

                "total_amount" =>
                    number_format(
                        $totalAmount,
                        2,
                        ".",
                        ""
                    ),

                "booking_status" =>
                    "confirmed"
            ]
        );


    } catch (PDOException $e) {

        if ($db->inTransaction()) {
            $db->rollBack();
        }

        sendResponse(
            500,
            false,
            "Failed to create booking"
        );
    }
}


// =====================================================
// PUT - UPDATE / CANCEL BOOKING
// Customer / Admin
// =====================================================

if ($method === "PUT") {

    $currentUser = requireRole([
        "admin",
        "customer"
    ]);


    // =================================================
    // BOOKING ID
    // =================================================

    if (!isset($_GET["id"])) {

        sendResponse(
            400,
            false,
            "Booking ID is required"
        );
    }


    $bookingId =
        validId(
            $_GET["id"]
        );


    if (!$bookingId) {

        sendResponse(
            400,
            false,
            "Invalid booking ID"
        );
    }


    // =================================================
    // REQUEST BODY
    // =================================================

    $data = getJsonBody();


    if (!isset($data["quantity"])) {

        sendResponse(
            400,
            false,
            "quantity is required"
        );
    }


    $newQuantity =
        validId(
            $data["quantity"]
        );


    if (!$newQuantity) {

        sendResponse(
            400,
            false,
            "Quantity must be greater than 0"
        );
    }


    $newStatus =
        strtolower(
            trim(
                $data["booking_status"]
                ?? "confirmed"
            )
        );


    $allowedStatuses = [
        "pending",
        "confirmed",
        "cancelled"
    ];


    if (
        !in_array(
            $newStatus,
            $allowedStatuses,
            true
        )
    ) {

        sendResponse(
            400,
            false,
            "Invalid booking status"
        );
    }


    try {

        $db->beginTransaction();


        // =================================================
        // GET CURRENT BOOKING
        // =================================================

        $stmt = $db->prepare("
            SELECT
                booking_id,
                customer_id,
                event_id,
                quantity,
                booking_status
            FROM bookings
            WHERE booking_id = ?
            FOR UPDATE
        ");


        $stmt->execute([
            $bookingId
        ]);


        $booking =
            $stmt->fetch(
                PDO::FETCH_ASSOC
            );


        if (!$booking) {

            $db->rollBack();

            sendResponse(
                404,
                false,
                "Booking not found"
            );
        }


        // =================================================
        // CUSTOMER OWNERSHIP CHECK
        // =================================================

        if (
            $currentUser["role"] === "customer" &&
            (int)$booking["customer_id"] !==
            (int)$currentUser["user_id"]
        ) {

            $db->rollBack();

            sendResponse(
                403,
                false,
                "You can only update your own bookings"
            );
        }


        // =================================================
        // GET EVENT
        // =================================================

        $stmt = $db->prepare("
            SELECT
                event_id,
                event_name,
                ticket_price,
                available_tickets
            FROM events
            WHERE event_id = ?
            FOR UPDATE
        ");


        $stmt->execute([
            $booking["event_id"]
        ]);


        $event =
            $stmt->fetch(
                PDO::FETCH_ASSOC
            );


        if (!$event) {

            $db->rollBack();

            sendResponse(
                404,
                false,
                "Event not found"
            );
        }


        $oldQuantity =
            (int)$booking["quantity"];

        $oldStatus =
            strtolower(
                $booking["booking_status"]
            );

        $available =
            (int)$event["available_tickets"];


        // =================================================
        // TICKET MANAGEMENT
        // =================================================

        $ticketChange = 0;


        // ACTIVE -> CANCELLED
        if (
            $oldStatus !== "cancelled" &&
            $newStatus === "cancelled"
        ) {

            // Restore old tickets
            $ticketChange =
                $oldQuantity;
        }


        // CANCELLED -> ACTIVE
        elseif (
            $oldStatus === "cancelled" &&
            $newStatus !== "cancelled"
        ) {

            if (
                $newQuantity >
                $available
            ) {

                $db->rollBack();

                sendResponse(
                    400,
                    false,
                    "Not enough tickets available"
                );
            }

            // Deduct tickets again
            $ticketChange =
                -$newQuantity;
        }


        // ACTIVE -> ACTIVE
        elseif (
            $oldStatus !== "cancelled" &&
            $newStatus !== "cancelled"
        ) {

            $difference =
                $newQuantity -
                $oldQuantity;


            if (
                $difference > 0 &&
                $difference > $available
            ) {

                $db->rollBack();

                sendResponse(
                    400,
                    false,
                    "Not enough tickets available"
                );
            }


            // If quantity increases:
            // ticketChange becomes negative
            //
            // If quantity decreases:
            // ticketChange becomes positive

            $ticketChange =
                -$difference;
        }


        // =================================================
        // CALCULATE NEW TOTAL
        // =================================================

        $totalAmount =
            (float)$event["ticket_price"]
            * $newQuantity;


        // =================================================
        // UPDATE BOOKING
        // =================================================

        $stmt = $db->prepare("
            UPDATE bookings
            SET
                quantity = ?,
                total_amount = ?,
                booking_status = ?
            WHERE booking_id = ?
        ");


        $stmt->execute([
            $newQuantity,
            $totalAmount,
            $newStatus,
            $bookingId
        ]);


        // =================================================
        // UPDATE AVAILABLE TICKETS
        // =================================================

        if ($ticketChange != 0) {

            $stmt = $db->prepare("
                UPDATE events
                SET available_tickets =
                    available_tickets + ?
                WHERE event_id = ?
            ");


            $stmt->execute([
                $ticketChange,
                $booking["event_id"]
            ]);
        }


        // =================================================
        // COMMIT
        // =================================================

        $db->commit();


        sendResponse(
            200,
            true,
            "Booking updated successfully",
            [
                "booking_id" =>
                    $bookingId,

                "event_id" =>
                    (int)$booking["event_id"],

                "event_name" =>
                    $event["event_name"],

                "old_quantity" =>
                    $oldQuantity,

                "new_quantity" =>
                    $newQuantity,

                "booking_status" =>
                    $newStatus,

                "total_amount" =>
                    number_format(
                        $totalAmount,
                        2,
                        ".",
                        ""
                    )
            ]
        );


    } catch (PDOException $e) {

        if ($db->inTransaction()) {
            $db->rollBack();
        }

        sendResponse(
            500,
            false,
            "Failed to update booking"
        );
    }
}


// =====================================================
// DELETE BOOKING
// ADMIN ONLY
// =====================================================

if ($method === "DELETE") {

    requireRole([
        "admin"
    ]);


    // =================================================
    // BOOKING ID
    // =================================================

    if (!isset($_GET["id"])) {

        sendResponse(
            400,
            false,
            "Booking ID is required"
        );
    }


    $bookingId =
        validId(
            $_GET["id"]
        );


    if (!$bookingId) {

        sendResponse(
            400,
            false,
            "Invalid booking ID"
        );
    }


    try {

        $db->beginTransaction();


        // =================================================
        // GET BOOKING
        // =================================================

        $stmt = $db->prepare("
            SELECT
                booking_id,
                event_id,
                quantity,
                booking_status
            FROM bookings
            WHERE booking_id = ?
            FOR UPDATE
        ");


        $stmt->execute([
            $bookingId
        ]);


        $booking =
            $stmt->fetch(
                PDO::FETCH_ASSOC
            );


        if (!$booking) {

            $db->rollBack();

            sendResponse(
                404,
                false,
                "Booking not found"
            );
        }


        // =================================================
        // DELETE BOOKING
        // =================================================

        $stmt = $db->prepare("
            DELETE FROM bookings
            WHERE booking_id = ?
        ");


        $stmt->execute([
            $bookingId
        ]);


        // =================================================
        // RESTORE TICKETS
        // Only if booking was active
        // =================================================

        if (
            strtolower(
                $booking["booking_status"]
            ) !== "cancelled"
        ) {

            $stmt = $db->prepare("
                UPDATE events
                SET available_tickets =
                    available_tickets + ?
                WHERE event_id = ?
            ");


            $stmt->execute([
                $booking["quantity"],
                $booking["event_id"]
            ]);
        }


        // =================================================
        // COMMIT
        // =================================================

        $db->commit();


        sendResponse(
            200,
            true,
            "Booking deleted successfully",
            [
                "booking_id" =>
                    $bookingId,

                "event_id" =>
                    (int)$booking["event_id"]
            ]
        );


    } catch (PDOException $e) {

        if ($db->inTransaction()) {
            $db->rollBack();
        }

        sendResponse(
            500,
            false,
            "Failed to delete booking"
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