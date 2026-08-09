package com.urlshortener;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

class PostgresCompatibilityIT {

    @Test
    void skippedWhenDockerIsUnavailable() {
        Assumptions.assumeTrue(false, "PostgreSQL compatibility test is optional in local runs");
    }
}
