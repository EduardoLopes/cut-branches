// @generated automatically by Diesel CLI.

diesel::table! {
    branches (id) {
        id -> Nullable<Integer>,
        repository_id -> Text,
        name -> Text,
        current -> Bool,
        fully_merged -> Bool,
        last_commit_sha -> Text,
        last_commit_short_sha -> Text,
        last_commit_date -> Text,
        last_commit_message -> Text,
        last_commit_author -> Text,
        last_commit_email -> Text,
        deleted_at -> Nullable<Text>,
        is_reachable -> Nullable<Bool>,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    locked_branches (id) {
        id -> Nullable<Integer>,
        repository_id -> Text,
        branch_name -> Text,
        created_at -> Timestamp,
    }
}

diesel::table! {
    metadata (key) {
        key -> Text,
        value -> Text,
        updated_at -> Timestamp,
    }
}

diesel::table! {
    notifications (id) {
        id -> Text,
        title -> Nullable<Text>,
        message -> Nullable<Text>,
        feedback -> Nullable<Text>,
        date -> Integer,
        created_at -> Timestamp,
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
    }
}

diesel::table! {
    selected_branches (id) {
        id -> Nullable<Integer>,
        repository_id -> Text,
        branch_name -> Text,
        created_at -> Timestamp,
    }
}

diesel::table! {
    settings (id) {
        id -> Nullable<Integer>,
        repository_id -> Nullable<Text>,
        key -> Text,
        value -> Text,
        created_at -> Timestamp,
        updated_at -> Timestamp,
    }
}

diesel::joinable!(branches -> repositories (repository_id));
diesel::joinable!(locked_branches -> repositories (repository_id));
diesel::joinable!(selected_branches -> repositories (repository_id));
diesel::joinable!(settings -> repositories (repository_id));

diesel::allow_tables_to_appear_in_same_query!(
    branches,
    locked_branches,
    metadata,
    notifications,
    repositories,
    selected_branches,
    settings,
);
