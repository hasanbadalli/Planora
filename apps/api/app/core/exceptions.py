class AuthenticationError(Exception):
    """Raised when supplied credentials or an access token are invalid."""


class RegistrationConflictError(Exception):
    """Raised when a username or email cannot be registered."""


class SecurityConfigurationError(Exception):
    """Raised when authentication secrets are not configured safely."""


class ResourceNotFoundError(Exception):
    """Raised when an owned resource does not exist or is not accessible."""


class ResourceConflictError(Exception):
    """Raised when a requested resource conflicts with existing data."""


class DomainValidationError(Exception):
    """Raised when otherwise valid input breaks a domain rule."""
