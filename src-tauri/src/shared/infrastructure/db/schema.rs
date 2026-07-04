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
        is_selected -> Bool,
        is_locked -> Bool,
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

diesel::allow_tables_to_appear_in_same_query!(branches, repositories,);
