package com.urlshortener.common.exception;

public class LinkGoneException extends RuntimeException {

    public LinkGoneException(String message) {
        super(message);
    }
}
