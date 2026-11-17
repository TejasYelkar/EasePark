# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Parking backend

The two- and four-wheeler parking screens and the admin slot screens read slot
status from the Spring Boot backend. Start MongoDB, then run the backend from
`D:\EasePark\smartpark-backend` with:

```powershell
.\mvnw.cmd spring-boot:run
```

The app refreshes parking data every 15 seconds and also supports pull-to-refresh.
The default API URL is `http://10.0.2.2:8080` on the Android emulator and
`http://localhost:8080` on web and iOS simulators.

For a physical device, create an ignored `.env.local` in this app folder and set
the computer's reachable LAN address (the device and computer must be on the
same network):

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.25:8080
```

Replace the example address with the computer's actual LAN IP, then restart
Expo so the URL is included in the app bundle. Use HTTPS for deployed backends.

User sign-up is stored in MongoDB, and sign-in verifies the selected vehicle
against that saved account before allowing access. Car and two-wheeler booking
create `PENDING` requests only for a registered account and one of its
registered vehicles. The server checks slot availability and overlapping
requests, calculates estimates at ₹30 per billable hour for cars and ₹20 per
billable hour for bikes, and stores requests in `parking_bookings`. For the
selected date and time range, only overlapping approved requests are shown as
reserved; pending requests do not reserve a slot, and rejected requests release
it.

Admins see pending requests in the dashboard notification bell, including the
vehicle number, date, entry/exit times, floor, slot, and estimated price. They
can approve or reject each request. The dashboard refreshes pending requests
every 15 seconds. The backend seeds the built-in demo user (`tejas`) and its
registered vehicles; the demo password remains local to the app.

Users can review request status in **My Parking Requests**. An approved booking
is treated as parked from its scheduled entry time and remains reserved after
the planned exit until the user chooses **Remove Vehicle** or taps their own
reserved slot in the parking screen and confirms **Cancel parking**. This saves
the checkout in the database, completes the booking, and releases the slot.
Late checkout adds ₹70 per started 20-minute interval for cars and ₹50 per
started interval for bikes. The user can then mark the parking charge and fine
as paid using the **demo payment** button. This records a dummy payment status
only; no payment provider is connected.

The car parking screen starts without a pre-selected date or entry/exit times;
users choose the schedule before sending a request. In the admin slot screen,
upcoming approved bookings appear as reserved and started bookings appear as
occupied. Admins can mark an unreserved slot for maintenance or make a
maintenance slot available again; a slot with an approved booking cannot be
placed into maintenance. These status changes are stored in MongoDB and are
reflected when the user app refreshes its slot list.

The **Payments** screen exports date-filtered payment records to an `.xlsx`
workbook, with field names in the header row and one record per row.
**Reports & Analytics** lets admins choose which data sections to export;
each selected section becomes a worksheet with the same column-header and
one-record-per-row layout. Date ranges filter bookings, payments, fines, and
user/vehicle registration records. Parking-slot status is a current snapshot
and is included only when the selected range contains the current date.

The flow uses `POST /api/users/register`, `POST /api/users/verify`,
`PUT /api/users/{userId}`, `POST /api/parking/bookings`, and the admin
`GET /api/admin/notifications` plus
`POST /api/admin/notifications/{bookingId}/decision` endpoints. Booking status
uses `GET /api/parking/bookings/user/{userId}`,
`POST /api/parking/bookings/{bookingId}/checkout`, and
`POST /api/parking/bookings/{bookingId}/payment`. Admin slot maintenance uses
`PUT /api/parking/slots/{slotNumber}/status`. App login and admin login are
still demo/local authentication; passwords are not sent to the backend, so add
server-side authentication and admin authorization before deploying this API
publicly.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
