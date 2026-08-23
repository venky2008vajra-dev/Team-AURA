package com.scamcheck.demo.service;

import com.scamcheck.demo.dto.request.LoginRequest;
import com.scamcheck.demo.dto.request.RegisterRequest;
import com.scamcheck.demo.dto.response.AuthResponse;
import com.scamcheck.demo.entity.User;
import com.scamcheck.demo.enums.Role;
import com.scamcheck.demo.repository.UserRepository;
import com.scamcheck.demo.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public User register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("An account with this email already exists");
        }
        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(Role.USER)
                .build();
        return userRepository.save(user);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
        String token = jwtService.generateToken(request.getEmail());
        return new AuthResponse(token, jwtService.getExpirationMs() / 1000);
    }
}
