package com.scamcheck.demo.controller;

import com.scamcheck.demo.dto.request.LoginRequest;
import com.scamcheck.demo.dto.request.RegisterRequest;
import com.scamcheck.demo.dto.response.AuthResponse;
import com.scamcheck.demo.entity.User;
import com.scamcheck.demo.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        User user = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                new Object() {
                    public final Long id = user.getId();
                    public final String email = user.getEmail();
                    public final String fullName = user.getFullName();
                }
        );
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}
