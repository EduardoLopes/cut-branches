// @generated automatically by Diesel CLI.

diesel::table! {
    branches (id) {
        id -> Nullable<Integer>,
        repository_id -> Text,
        name -> Text,
        current -> Bool,
        fully_merged -> Bool,
        head_commit_sha -> Text,
        upstream -> Nullable<Text>,
        deleted_at -> Nullable<Text>,
        is_reachable -> Nullable<Bool>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
        is_selected -> Bool,
        is_locked -> Bool,
    }
}

diesel::table! {
    cleanup_history (id) {
        id -> Nullable<Integer>,
        repository_id -> Text,
        target_path -> Text,
        folder_name -> Text,
        bytes_freed -> BigInt,
        deletion_mode -> Text,
        cleaned_at -> Timestamp,
    }
}

diesel::table! {
    commits (sha) {
        sha -> Text,
        short_sha -> Text,
        date -> Text,
        message -> Text,
        summary -> Text,
        author -> Text,
        email -> Text,
    }
}

diesel::table! {
    repositories (id) {
        id -> Text,
        name -> Text,
        path -> Text,
        current_branch -> Text,
        branches_count -> Integer,
        created_at -> Timestamp,
        updated_at -> Timestamp,
        last_sync_timestamp -> Nullable<Integer>,
        last_synced_at -> Nullable<Timestamp>,
    }
}

diesel::joinable!(branches -> repositories (repository_id));
diesel::joinable!(branches -> commits (head_commit_sha));

diesel::allow_tables_to_appear_in_same_query!(branches, commits, repositories,);
