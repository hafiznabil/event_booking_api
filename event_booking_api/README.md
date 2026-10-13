# Event Booking System RESTful Web API

## Project Overview

The Event Booking System is a web-based application developed to manage events, venues, users, and event bookings through a RESTful Web API.

The system provides different functionalities based on three user roles:

- Admin
- Organiser
- Customer

The backend was developed using PHP and MySQL, while the frontend uses HTML, CSS, and JavaScript. The system is hosted locally using XAMPP.

---

## Technologies Used

- PHP
- MySQL
- HTML5
- CSS3
- JavaScript
- RESTful Web API
- XAMPP
- phpMyAdmin
- Postman
- QuickChart QR Code API

---

## Main Features

### Admin

The administrator can:

- View dashboard information
- Manage users
- Manage events
- View and manage bookings
- Access protected administrative functions

### Organiser

The organiser can:

- View organiser dashboard
- View own events
- Create new events
- Update event information
- View customer bookings
- Filter booking information

### Customer

The customer can:

- Login to the system
- Browse available events
- Search for events
- View event information
- Book event tickets
- View booking history
- Cancel bookings
- Receive a QR ticket for confirmed bookings

---

## Database

Database name:

```text
event_booking_db
```

The database contains four main tables:

1. `users`
2. `venues`
3. `events`
4. `bookings`

### Database Relationships

- One organiser can manage multiple events.
- One venue can host multiple events.
- One customer can create multiple bookings.
- One event can have multiple bookings.

The database uses primary keys and foreign keys to maintain referential integrity.

---

## RESTful API Resources

The system provides four main API resources.

### Users

```text
/api/users.php
```

Supported methods:

- GET
- POST
- PUT
- DELETE

### Events

```text
/api/events.php
```

Supported methods:

- GET
- POST
- PUT
- DELETE

### Venues

```text
/api/venues.php
```

Supported methods:

- GET
- POST
- PUT
- DELETE

### Bookings

```text
/api/bookings.php
```

Supported methods:

- GET
- POST
- PUT
- DELETE

---

## Authentication

Authentication is provided through:

```text
/api/login.php
```

The login process validates the user's email and password before returning the authenticated user's information and role.

The system supports three roles:

```text
admin
organiser
customer
```

Role-based controls are used to restrict access to protected functionality.

---

## Middleware

Authentication and role checking are handled using:

```text
/middleware/auth_middleware.php
```

The middleware checks user information supplied to protected API requests and prevents unauthorised role access.

Protected API testing can be performed in Postman using headers such as:

```text
X-User-ID
X-User-Role
```

---

## Request Validation and Error Handling

The API validates incoming data before database operations are performed.

Examples include:

- Required field validation
- Invalid user ID
- Invalid event ID
- Invalid venue ID
- Invalid booking quantity
- Invalid user role
- Invalid venue capacity
- Insufficient available tickets
- Resource not found
- Invalid login credentials

The API returns JSON responses with appropriate success or error messages.

---

## Event Search and Filtering

The Events API supports search and filtering functionality.

Users can search events using information such as:

- Event name
- Venue
- Location

Event information can also be filtered using supported API parameters.

This provides more efficient retrieval of event information.

---

## API Request Logging

The project includes API request logging as an additional API management feature.

Logger file:

```text
/middleware/logger.php
```

Generated log:

```text
/logs/api_requests.log
```

The logger records request information such as:

- Date and time
- HTTP method
- API endpoint
- User ID
- User role
- Client IP address

This feature assists with monitoring and debugging API activity.

---

## External API Integration

The system integrates an external QR Code Generator API provided by QuickChart.

The external service generates QR code tickets for confirmed customer bookings.

The QR ticket contains booking-related information and is displayed on the customer's My Bookings page.

Cancelled bookings do not display an active QR ticket.

External API service:

```text
QuickChart QR Code API
```

Example endpoint format:

```text
https://quickchart.io/qr?text=BOOKING_INFORMATION
```

This integration demonstrates communication between the Event Booking System and an external web service.

---

## Booking Business Logic

When a customer successfully creates a booking:

1. The booking is stored in the database.
2. The requested quantity is validated.
3. Available tickets for the selected event are reduced.

When a confirmed booking is cancelled:

1. The booking status is updated.
2. The cancelled quantity is returned to the event.
3. The available ticket count is restored.
4. The QR ticket is no longer available for the cancelled booking.

This prevents incorrect ticket availability.

---

## API Testing

The RESTful API was tested using Postman.

Testing includes:

- Successful GET requests
- Successful POST requests
- Successful PUT requests
- Successful DELETE requests
- Invalid IDs
- Missing required fields
- Invalid quantities
- Invalid capacities
- Invalid roles
- Login validation
- Authentication and role testing
- Search and filtering
- External QR API testing
- Negative and error test cases

The Postman collection is included in the project:

```text
event_booking_api.postman_collection.json
```

---

## Installation and Setup

### 1. Install XAMPP

Install XAMPP and ensure the following services are running:

```text
Apache
MySQL
```

### 2. Copy the Project

Place the project folder inside:

```text
C:\xampp\htdocs\
```

The final location should be:

```text
C:\xampp\htdocs\event_booking_api
```

### 3. Import Database

Open phpMyAdmin:

```text
http://localhost/phpmyadmin/
```

Create a database named:

```text
event_booking_db
```

Import:

```text
database/event_booking_db.sql
```

### 4. Database Configuration

Database connection settings are stored in:

```text
config/database.php
```

Make sure the configuration matches the local MySQL environment.

### 5. Run the Frontend

Open the frontend using the local development server used for the project.

Example:

```text
http://localhost:3000/frontend/login.html
```

### 6. API Base URL

The API is available from:

```text
http://localhost/event_booking_api/api/
```

Example:

```text
http://localhost/event_booking_api/api/events.php
```

---

## Project Structure

```text
event_booking_api/
│
├── api/
│   ├── bookings.php
│   ├── events.php
│   ├── login.php
│   ├── users.php
│   └── venues.php
│
├── config/
│   └── database.php
│
├── database/
│   └── event_booking_db.sql
│
├── frontend/
│   ├── admin-bookings.html
│   ├── admin-bookings.js
│   ├── admin-dashboard.html
│   ├── admin-dashboard.js
│   ├── admin-events.html
│   ├── admin-events.js
│   ├── admin-users.html
│   ├── admin-users.js
│   ├── auth.js
│   ├── book-event.html
│   ├── book-event.js
│   ├── events.html
│   ├── events.js
│   ├── login.html
│   ├── my-bookings.html
│   ├── my-bookings.js
│   ├── organiser-bookings.html
│   ├── organiser-bookings.js
│   ├── organiser-dashboard.html
│   ├── organiser-dashboard.js
│   ├── organiser-events.html
│   ├── organiser-events.js
│   ├── script.js
│   └── style.css
│
├── logs/
│   └── api_requests.log
│
├── middleware/
│   ├── auth_middleware.php
│   └── logger.php
│
├── event_booking_api.postman_collection.json
├── README.md
└── test_connection.php
```

---

## Testing Summary

The system was tested for the main workflows of all three user roles.

### Customer Flow

```text
Login → Browse Events → Search Event → Book Event
→ View My Bookings → Generate QR Ticket → Cancel Booking
```

### Organiser Flow

```text
Login → Dashboard → View Own Events
→ Create Event → Edit Event → View Customer Bookings
```

### Admin Flow

```text
Login → Dashboard → Manage Events
→ Manage Users → Manage Bookings
```

---

## Advanced Features

The project implements additional API features including:

1. Event search and filtering
2. API request logging
3. Authentication and role-based access control
4. Request validation and error handling
5. External QR Code API integration

---

## Author

**Muhammad Hafiz Nabil Bin Zaini**

Diploma in Computer Science  
Universiti Poly-Tech Malaysia (UPTM)

---

## Project Status

The Event Booking System has been developed and tested locally using XAMPP, MySQL, Postman, and a web browser.