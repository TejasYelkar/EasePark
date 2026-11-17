
package com.smartpark.config;

import com.smartpark.model.ParkingSlot;
import com.smartpark.model.User;
import com.smartpark.model.Vehicle;
import com.smartpark.repository.ParkingSlotRepository;
import com.smartpark.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class ParkingSlotInitializer implements ApplicationRunner {

    private final ParkingSlotRepository repository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${smartpark.slots.bike-total}")
    private int totalBikeSlots;

    @Value("${smartpark.slots.car-total}")
    private int totalCarSlots;

    public ParkingSlotInitializer(
            ParkingSlotRepository repository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {

        if (totalBikeSlots < 0 || totalCarSlots < 0) {
            throw new IllegalStateException(
                    "Parking slot counts cannot be negative.");
        }

        initializeSlots(
                totalBikeSlots,
                ParkingSlot.SlotType.BIKE,
                "B"
        );

        initializeSlots(
                totalCarSlots,
                ParkingSlot.SlotType.CAR,
                "C"
        );

        initializeDemoUser();
    }

    private void initializeDemoUser() {
        var existingUser = userRepository.findByUsernameIgnoreCase("tejas");
        if (existingUser.isPresent()) {
            User demoUser = existingUser.get();
            if (demoUser.getPasswordHash() == null) {
                demoUser.setPasswordHash(passwordEncoder.encode("12345678"));
                userRepository.save(demoUser);
            }
            return;
        }

        User demoUser = new User();
        demoUser.setUsername("tejas");
        demoUser.setEmail("tejas@example.com");
        demoUser.setPhone("9876543210");
        demoUser.setPasswordHash(passwordEncoder.encode("12345678"));
        demoUser.setVehicles(java.util.List.of(
                new Vehicle("2 Wheeler", "MH03AQ7091"),
                new Vehicle("4 Wheeler", "MH03AQ7091")
        ));
        userRepository.save(demoUser);
    }

    private void initializeSlots(
            int totalSlots,
            ParkingSlot.SlotType type,
            String prefix) {

        int baseSlots = totalSlots / 3;
        int remainder = totalSlots % 3;

        for (int floor = 1; floor <= 3; floor++) {

            int slotsOnFloor =
                    baseSlots + (floor <= remainder ? 1 : 0);

            for (int slot = 1;
                    slot <= slotsOnFloor;
                    slot++) {

                String slotNumber = String.format(
                        "%s%d-%03d",
                        prefix,
                        floor,
                        slot
                );

                if (!repository.existsBySlotNumber(slotNumber)) {

                    ParkingSlot parkingSlot = new ParkingSlot(
                            slotNumber,
                            floor,
                            type,
                            ParkingSlot.SlotStatus.AVAILABLE
                    );

                    repository.save(parkingSlot);
                }
            }
        }

        System.out.println(
                type + " slots initialized successfully."
        );
    }
}
