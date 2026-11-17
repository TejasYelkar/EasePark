# Architecture Diagram

EasePark is a parking-management system with an Expo React Native client and a Spring Boot REST backend. The backend persists domain documents in MongoDB and exposes authentication, parking, booking, payment, ANPR, and administration flows.

## Application Architecture

<!-- mermaid-checked: no \n, no em-dash/en-dash, no {} in labels, subgraphs are id["label"], arrows are -->|"label"|, all subgraphs closed by end, ids unique -->
~~~mermaid
flowchart TD
    subgraph ClientLayer["Client Layer"]
        Mobile["Expo React Native App"]
        Screens["User and Admin Screens"]
        ClientServices["Typed API Services"]
    end
    subgraph ApiLayer["API Layer - Spring Boot"]
        Controllers["REST Controllers"]
        Validation["Request Validation"]
        ExceptionHandler["API Exception Handler"]
    end
    subgraph BusinessLayer["Business Layer"]
        UserLogic["User and Password Services"]
        BookingLogic["Booking Service"]
        SlotLogic["Parking Slot Service"]
        VehicleLogic["Vehicle Services"]
    end
    subgraph DataLayer["Data Layer"]
        Repositories["Spring Data Mongo Repositories"]
        Mongo[("MongoDB smartpark")]
    end
    subgraph ExternalLayer["External Services"]
        Mail["SMTP Mail Service"]
        Anpr["ANPR Recognition API"]
    end

    Mobile -->|"renders"| Screens
    Screens -->|"calls"| ClientServices
    ClientServices -->|"HTTP JSON"| Controllers
    Controllers -->|"validates"| Validation
    Validation -->|"dispatches"| UserLogic
    Validation -->|"dispatches"| BookingLogic
    Validation -->|"dispatches"| SlotLogic
    Validation -->|"dispatches"| VehicleLogic
    Controllers -.->|"formats errors"| ExceptionHandler
    UserLogic -->|"persists users"| Repositories
    BookingLogic -->|"persists bookings"| Repositories
    SlotLogic -->|"persists slots"| Repositories
    VehicleLogic -->|"persists vehicles"| Repositories
    Repositories -->|"Mongo queries"| Mongo
    UserLogic -->|"reset email"| Mail
    ClientServices -->|"plate image"| Anpr
~~~

### Technology Stack Summary

| Layer | Technology | Version | Purpose |
|---|---|---:|---|
| Mobile client | React Native | 0.88.1 | Cross-platform mobile and web UI |
| Mobile framework | Expo and Expo Router | 58.x | App runtime, navigation, camera, storage, and sharing |
| Client language | TypeScript and JavaScript | TypeScript 6.0.3 | Typed API models and UI logic |
| Backend framework | Spring Boot Web MVC | 4.1.2 | REST API and application runtime |
| Backend language | Java | 17 | Domain and service implementation |
| Persistence | Spring Data MongoDB | Spring Boot managed | Repository access to MongoDB |
| Validation | Jakarta Bean Validation | Spring Boot managed | DTO and request validation |
| Email | Spring Mail | Spring Boot managed | Password reset messages |
| ANPR integration | HTTP ANPR API | Configured by environment | License-plate recognition |

### Data Storage & External Services

MongoDB stores users, parking bookings, parking slots, and unregistered vehicles as document collections. The backend optionally sends password-reset email through SMTP. The mobile app calls a separately configured ANPR endpoint for plate recognition and calls the Spring Boot API for parking operations.

### Key Architectural Decisions

- Uses controller, service, and repository layers with constructor injection.
- Uses MongoDB documents and Spring Data repository interfaces instead of a relational persistence layer.
- Keeps API access in client service modules and refreshes parking-slot data through a reusable React hook.

## Component Relationships

<!-- mermaid-checked: no \n, no em-dash/en-dash, no {} in labels, subgraphs are id["label"], arrows are -->|"label"|, all subgraphs closed by end, ids unique -->
~~~mermaid
flowchart LR
    subgraph Presentation["Presentation and API"]
        cAuth["AuthController"]
        cParking["ParkingController"]
        cSlots["ParkingSlotController"]
        cAdmin["AdminController"]
        cUnregistered["UnregisteredVehicleController"]
        cHealth["HealthController"]
        cHandler["ApiValidationExceptionHandler"]
        cMobile["React Native Screens"]
    end
    subgraph Business["Business Services"]
        cUserService["UserService"]
        cResetService["PasswordResetService"]
        cBookingService["ParkingBookingService"]
        cSlotService["ParkingSlotService"]
        cVehicleService["UnregisteredVehicleService"]
    end
    subgraph Persistence["Repositories and Domain Models"]
        cUserRepo["UserRepository"]
        cBookingRepo["ParkingBookingRepository"]
        cSlotRepo["ParkingSlotRepository"]
        cVehicleRepo["UnregisteredVehicleRepository"]
        cUser["User"]
        cVehicle["Vehicle"]
        cBooking["ParkingBooking"]
        cSlot["ParkingSlot"]
        cTempVehicle["UnregisteredVehicle"]
    end
    subgraph Integrations["Infrastructure"]
        cMail["JavaMailSender"]
        cAnpr["ANPR API Client"]
        cInitializer["ParkingSlotInitializer"]
    end

    cMobile -->|"HTTP requests"| cAuth
    cMobile -->|"booking requests"| cParking
    cMobile -->|"slot requests"| cSlots
    cMobile -->|"admin requests"| cAdmin
    cMobile -->|"plate recognition"| cAnpr
    cAuth -->|"delegates auth"| cUserService
    cAuth -->|"delegates reset"| cResetService
    cParking -->|"delegates booking"| cBookingService
    cSlots -->|"delegates slots"| cSlotService
    cAdmin -->|"reviews bookings"| cBookingService
    cAdmin -->|"reads users"| cUserRepo
    cUnregistered -->|"delegates vehicle"| cVehicleService
    cHandler -.->|"handles validation errors"| cAuth
    cHandler -.->|"handles validation errors"| cParking
    cUserService -->|"uses"| cUserRepo
    cUserService -->|"manages"| cUser
    cUser -->|"contains"| cVehicle
    cResetService -->|"updates"| cUserRepo
    cResetService -->|"sends mail"| cMail
    cBookingService -->|"uses"| cBookingRepo
    cBookingService -->|"checks users"| cUserRepo
    cBookingService -->|"checks slots"| cSlotRepo
    cBookingService -->|"creates"| cBooking
    cSlotService -->|"uses"| cSlotRepo
    cSlotService -->|"checks reservations"| cBookingRepo
    cSlotService -->|"manages"| cSlot
    cVehicleService -->|"uses"| cVehicleRepo
    cVehicleService -->|"creates"| cTempVehicle
    cInitializer -->|"seeds"| cSlotRepo
    cInitializer -->|"seeds"| cUserRepo
~~~

### Component Inventory

| Component | Layer | Type | Responsibility |
|---|---|---|---|
| AuthController | Presentation | REST controller | Registration, login, profile, and password-reset endpoints |
| ParkingController | Presentation | REST controller | Booking creation, checkout, and payment endpoints |
| ParkingSlotController | Presentation | REST controller | Slot listing, availability, and status updates |
| AdminController | Presentation | REST controller | Booking decisions and administrative user and booking views |
| UnregisteredVehicleController | Presentation | REST controller | Temporary vehicle registration endpoint |
| HealthController | Presentation | REST controller | Backend health endpoint |
| ApiValidationExceptionHandler | Presentation | Exception handler | Converts validation failures into API responses |
| UserService | Business | Service | User registration, authentication, and vehicle verification |
| PasswordResetService | Business | Service | Reset-code generation, validation, and email delivery |
| ParkingBookingService | Business | Service | Booking lifecycle, conflict checks, pricing, fines, checkout, and payment |
| ParkingSlotService | Business | Service | Slot filtering, availability, occupancy, and status changes |
| UnregisteredVehicleService | Business | Service | Temporary vehicle normalization and persistence |
| UserRepository | Persistence | Mongo repository | Stores and queries users |
| ParkingBookingRepository | Persistence | Mongo repository | Stores and queries bookings |
| ParkingSlotRepository | Persistence | Mongo repository | Stores and queries parking slots |
| UnregisteredVehicleRepository | Persistence | Mongo repository | Stores temporary vehicles |
| User | Domain model | Mongo document | Account, credentials, reset state, and registered vehicles |
| Vehicle | Domain model | Embedded value object | Registered vehicle type and number |
| ParkingBooking | Domain model | Mongo document | Reservation, status, payment, and fine state |
| ParkingSlot | Domain model | Mongo document | Slot identity, type, floor, and occupancy status |
| UnregisteredVehicle | Domain model | Mongo document | Temporary vehicle and owner details |
| ParkingSlotInitializer | Infrastructure | Startup runner | Seeds demo user and configured parking slots |
| React Native Screens | Client | UI components | User, booking, parking, and admin workflows |
| ANPR API Client | Infrastructure | External integration | Sends captured images for plate recognition |
| JavaMailSender | Infrastructure | External integration | Sends password-reset email |
