package com.urlshortener.url;

import java.security.SecureRandom;
import org.springframework.stereotype.Component;

@Component
public class ShortCodeGenerator {

    private static final char[] ALPHABET =
            "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".toCharArray();

    private final SecureRandom random = new SecureRandom();

    public String generate(int length) {
        if (length < 1) {
            throw new IllegalArgumentException("Short code length must be positive");
        }
        StringBuilder code = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            code.append(ALPHABET[random.nextInt(ALPHABET.length)]);
        }
        return code.toString();
    }

    
    public int alphabetSize() {
        return ALPHABET.length;
    }
}
