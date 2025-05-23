#[derive(serde::Serialize, Debug)]
pub struct Error {
    pub message: String,
    pub kind: String,
    pub description: Option<String>,
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)?;
        if let Some(desc) = &self.description {
            write!(f, " ({})", desc)?;
        }
        Ok(())
    }
}

impl std::error::Error for Error {}

impl From<Error> for String {
    fn from(error: Error) -> String {
        error.message
    }
}

impl Error {
    pub fn new(message: String, kind: &str, description: Option<String>) -> Self {
        Self {
            message,
            kind: kind.to_string(),
            description,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_creation() {
        // Test creating an error with a description
        let error = Error::new(
            "Test error message".to_string(),
            "test_error",
            Some("Error description".to_string()),
        );

        assert_eq!(error.message, "Test error message");
        assert_eq!(error.kind, "test_error");
        assert_eq!(error.description, Some("Error description".to_string()));

        // Test creating an error without a description
        let error = Error::new("Test error message".to_string(), "test_error", None);

        assert_eq!(error.message, "Test error message");
        assert_eq!(error.kind, "test_error");
        assert_eq!(error.description, None);
    }

    #[test]
    fn test_error_display() {
        // Test display formatting with description
        let error = Error::new(
            "Test error message".to_string(),
            "test_error",
            Some("Error description".to_string()),
        );

        assert_eq!(error.to_string(), "Test error message (Error description)");

        // Test display formatting without description
        let error = Error::new("Test error message".to_string(), "test_error", None);

        assert_eq!(error.to_string(), "Test error message");
    }

    #[test]
    fn test_error_as_std_error() {
        // Test that our Error implements std::error::Error
        let error = Error::new(
            "Test error message".to_string(),
            "test_error",
            Some("Error description".to_string()),
        );

        // Check that the error can be used as a Box<dyn std::error::Error>
        let std_error: Box<dyn std::error::Error> = Box::new(error);

        // Verify we can get the error message from the std error
        assert_eq!(
            std_error.to_string(),
            "Test error message (Error description)"
        );
    }
}
