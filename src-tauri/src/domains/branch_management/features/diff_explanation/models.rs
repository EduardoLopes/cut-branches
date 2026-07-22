//! Domain models for the diff-explanation feature.
//!
//! The agent is pluggable (Ports & Adapters): `AgentConfig` describes *which*
//! local CLI to run and *how* to read its output, so swapping Claude Code for
//! `gemini`/`gcloud` is a config change, not a code change. The baked-in
//! default targets Claude Code's headless `stream-json` mode.

use serde::{Deserialize, Serialize};

/// How the adapter interprets each line of the agent's stdout.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AgentOutputFormat {
    /// Each line is a JSON event; the text delta is extracted from it. The
    /// robust path — no TUI/ANSI parsing (Claude Code `--output-format
    /// stream-json`).
    StreamJson,
    /// Each non-empty line is itself a text delta. Fallback for simpler agents.
    PlainText,
}

/// The reviewer-chosen shape of an explanation. Chosen per request (a header
/// selector in the UI); the default keeps explanations short.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum ExplanationStyle {
    /// One or two sentences: what changed and why it matters.
    #[default]
    Succinct,
    /// A fuller walkthrough of the change and its notable specifics.
    Detailed,
    /// Reviewer lens: risks, likely bugs, and edge cases to double-check.
    ReviewFocused,
    /// Non-technical summary for PMs/QAs — no jargon.
    PlainLanguage,
}

impl ExplanationStyle {
    /// The instruction spliced into the prompt's `{style}` placeholder.
    pub fn instruction(self) -> &'static str {
        match self {
            Self::Succinct => {
                "In one or two sentences, explain what changed in the file `{path}` and why it \
matters — intent and impact only, no line-by-line restatement."
            }
            Self::Detailed => {
                "Explain what changed in the file `{path}` and why, walking through the notable \
specifics of the change. Be thorough, but don't restate every line verbatim."
            }
            Self::ReviewFocused => {
                "Review the change to the file `{path}` as a critical reviewer: call out risks, \
likely bugs, edge cases, and anything worth double-checking. Mention what looks correct only \
briefly."
            }
            Self::PlainLanguage => {
                "Explain what the change to the file `{path}` does in plain, non-technical \
language suitable for a product manager or QA. Avoid jargon and code-level detail."
            }
        }
    }

    /// The per-hunk verbosity phrase, spliced after "explain that hunk" in the
    /// change-group prompt. Kept short — one clause per hunk keeps the output
    /// scannable next to the diff.
    pub fn hunk_instruction(self) -> &'static str {
        match self {
            Self::Succinct => "in a single short sentence",
            Self::Detailed => "in one or two sentences, covering the specifics",
            Self::ReviewFocused => {
                "flagging any risk, bug, or edge case it introduces (say \"looks fine\" if none)"
            }
            Self::PlainLanguage => "in one plain-language sentence, avoiding jargon",
        }
    }
}

/// The `{style}` / `{path}` / `{diff}` placeholders a prompt template may
/// contain. `{path}` also appears inside each style instruction.
const STYLE_PLACEHOLDER: &str = "{style}";
const PATH_PLACEHOLDER: &str = "{path}";
const DIFF_PLACEHOLDER: &str = "{diff}";

/// Programs the app is willing to spawn. Guards against a mis-set config
/// turning the explainer into an arbitrary-command runner.
const ALLOWED_PROGRAMS: &[&str] = &["claude", "gemini", "gcloud"];

/// True when `program` is one the app is allowed to spawn.
pub fn is_allowed_program(program: &str) -> bool {
    ALLOWED_PROGRAMS.contains(&program)
}

/// Which binary to run, how to invoke it, how to read it, and the prompt to
/// feed it. Held in Tauri managed state; a settings command to override it can
/// come later (out of scope for v1).
#[derive(Debug, Clone)]
pub struct AgentConfig {
    /// Executable name/path (validated against [`is_allowed_program`]).
    pub program: String,
    /// Fixed arguments passed before the prompt is streamed over stdin.
    pub args: Vec<String>,
    pub output_format: AgentOutputFormat,
    /// Contains `{style}`, `{path}` and `{diff}` placeholders.
    pub prompt_template: String,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            program: "claude".to_string(),
            // Headless print mode with a machine-readable stream. `--verbose`
            // is required for `stream-json` to actually stream line-by-line.
            args: vec![
                "-p".to_string(),
                "--output-format".to_string(),
                "stream-json".to_string(),
                "--verbose".to_string(),
            ],
            output_format: AgentOutputFormat::StreamJson,
            prompt_template: default_prompt_template(),
        }
    }
}

impl AgentConfig {
    /// Fills the template's `{style}` / `{path}` / `{diff}` placeholders (the
    /// style instruction may itself contain `{path}`, so it is spliced first).
    /// Used verbatim as the agent's stdin.
    pub fn render_prompt(
        &self,
        style: ExplanationStyle,
        file_path: &str,
        diff_text: &str,
    ) -> String {
        self.prompt_template
            .replace(STYLE_PLACEHOLDER, style.instruction())
            .replace(PATH_PLACEHOLDER, file_path)
            .replace(DIFF_PLACEHOLDER, diff_text)
    }

    /// Whether this config's program is on the allowlist.
    pub fn is_program_allowed(&self) -> bool {
        is_allowed_program(&self.program)
    }
}

/// The shipped prompt frame; the reviewer-chosen style supplies the actual
/// instruction (verbosity + focus).
fn default_prompt_template() -> String {
    "You are helping a developer review a code change. {style}\n\n\
Respond in plain Markdown and do not ask follow-up questions.\n\n\
Unified diff:\n\n{diff}\n"
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_targets_claude_code_stream_json() {
        let config = AgentConfig::default();
        assert_eq!(config.program, "claude");
        assert_eq!(config.output_format, AgentOutputFormat::StreamJson);
        assert!(config.args.contains(&"stream-json".to_string()));
        assert!(config.is_program_allowed());
    }

    #[test]
    fn render_prompt_fills_every_placeholder() {
        let config = AgentConfig::default();
        let prompt = config.render_prompt(
            ExplanationStyle::Succinct,
            "src/a.ts",
            "@@ -1 +1 @@\n-old\n+new",
        );
        assert!(prompt.contains("src/a.ts"));
        assert!(prompt.contains("+new"));
        assert!(!prompt.contains(STYLE_PLACEHOLDER));
        assert!(!prompt.contains(PATH_PLACEHOLDER));
        assert!(!prompt.contains(DIFF_PLACEHOLDER));
    }

    #[test]
    fn render_prompt_replaces_every_occurrence() {
        let config = AgentConfig {
            program: "claude".to_string(),
            args: vec![],
            output_format: AgentOutputFormat::PlainText,
            prompt_template: "{path} {path} :: {diff}".to_string(),
        };
        assert_eq!(
            config.render_prompt(ExplanationStyle::Succinct, "p", "d"),
            "p p :: d"
        );
    }

    #[test]
    fn default_style_is_succinct() {
        assert_eq!(ExplanationStyle::default(), ExplanationStyle::Succinct);
    }

    #[test]
    fn every_style_yields_a_distinct_non_empty_instruction() {
        let styles = [
            ExplanationStyle::Succinct,
            ExplanationStyle::Detailed,
            ExplanationStyle::ReviewFocused,
            ExplanationStyle::PlainLanguage,
        ];
        let instructions: Vec<&str> = styles.iter().map(|s| s.instruction()).collect();
        for instruction in &instructions {
            assert!(!instruction.is_empty());
            // Each instruction embeds the file placeholder so render fills it.
            assert!(instruction.contains(PATH_PLACEHOLDER));
        }
        // All four differ.
        let unique: std::collections::HashSet<&&str> = instructions.iter().collect();
        assert_eq!(unique.len(), styles.len());
    }

    #[test]
    fn every_style_yields_a_distinct_non_empty_hunk_instruction() {
        let styles = [
            ExplanationStyle::Succinct,
            ExplanationStyle::Detailed,
            ExplanationStyle::ReviewFocused,
            ExplanationStyle::PlainLanguage,
        ];
        let phrases: Vec<&str> = styles.iter().map(|s| s.hunk_instruction()).collect();
        assert!(phrases.iter().all(|p| !p.is_empty()));
        let unique: std::collections::HashSet<&&str> = phrases.iter().collect();
        assert_eq!(unique.len(), styles.len());
    }

    #[test]
    fn detailed_style_reaches_the_rendered_prompt() {
        let config = AgentConfig::default();
        let prompt = config.render_prompt(ExplanationStyle::Detailed, "src/a.ts", "diff");
        assert!(prompt.contains("walking through the notable"));
        assert!(prompt.contains("src/a.ts"));
    }

    #[test]
    fn allowlist_accepts_known_and_rejects_unknown() {
        assert!(is_allowed_program("claude"));
        assert!(is_allowed_program("gemini"));
        assert!(is_allowed_program("gcloud"));
        assert!(!is_allowed_program("rm"));
        assert!(!is_allowed_program(""));

        let bad = AgentConfig {
            program: "sh".to_string(),
            ..AgentConfig::default()
        };
        assert!(!bad.is_program_allowed());
    }
}
