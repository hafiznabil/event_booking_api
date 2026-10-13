<?php

// =====================================================
// API REQUEST LOGGER
// =====================================================
// Records API request activity into:
// logs/api_requests.log
//
// Example:
// [2026-10-11 22:00:00] POST /event_booking_api/api/bookings.php | User ID: 4 | Role: customer | IP: 127.0.0.1
// =====================================================


function logApiRequest()
{
    // -------------------------------------------------
    // SET MALAYSIA TIMEZONE
    // -------------------------------------------------

    date_default_timezone_set("Asia/Kuala_Lumpur");


    // -------------------------------------------------
    // LOG DIRECTORY
    // -------------------------------------------------

    $logDirectory = __DIR__ . "/../logs";


    // Create logs folder automatically if it does not exist
    if (!is_dir($logDirectory)) {

        mkdir(
            $logDirectory,
            0777,
            true
        );
    }


    // -------------------------------------------------
    // LOG FILE
    // -------------------------------------------------

    $logFile =
        $logDirectory . "/api_requests.log";


    // -------------------------------------------------
    // GET REQUEST INFORMATION
    // -------------------------------------------------

    $dateTime =
        date("Y-m-d H:i:s");

    $method =
        $_SERVER["REQUEST_METHOD"] ?? "UNKNOWN";

    $uri =
        $_SERVER["REQUEST_URI"] ?? "UNKNOWN";

    $ipAddress =
        $_SERVER["REMOTE_ADDR"] ?? "UNKNOWN";


    // -------------------------------------------------
    // GET USER INFORMATION FROM HEADERS
    // -------------------------------------------------

    $headers = function_exists("getallheaders")
        ? getallheaders()
        : [];


    $userId = "Guest";
    $userRole = "Guest";


    foreach ($headers as $key => $value) {

        if (
            strtolower($key) ===
            "x-user-id"
        ) {
            $userId = $value;
        }


        if (
            strtolower($key) ===
            "x-user-role"
        ) {
            $userRole = $value;
        }
    }


    // -------------------------------------------------
    // BUILD LOG MESSAGE
    // -------------------------------------------------

    $logMessage =
        "[" . $dateTime . "] " .
        $method . " " .
        $uri .
        " | User ID: " . $userId .
        " | Role: " . $userRole .
        " | IP: " . $ipAddress .
        PHP_EOL;


    // -------------------------------------------------
    // WRITE LOG
    // -------------------------------------------------

    file_put_contents(
        $logFile,
        $logMessage,
        FILE_APPEND | LOCK_EX
    );
}