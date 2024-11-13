# cut-branches

## 0.3.1

### Patch Changes

- refactor: enhance remove-repository-modal by clearing search and selected repository states on removal

- [`d2736c7`](https://github.com/EduardoLopes/cut-branches/commit/d2736c746a6b2e15eef4c19a452079df8488c116) - refactor: extract local storage logic into set-local-storage utility function (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

## 0.3.0

### Minor Changes

- [`8a504eb`](https://github.com/EduardoLopes/cut-branches/commit/8a504eb6014bec471af01120bfca891d2e805310) - feat(branch): can lock branches (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`f7e8a91`](https://github.com/EduardoLopes/cut-branches/commit/f7e8a917f8e638b49a9af6d8720de1f393a163dd) - feat(notifications): implement infinite scroll for notifications popover (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`1d336ba`](https://github.com/EduardoLopes/cut-branches/commit/1d336ba497087cccbf01e5ae08a233ad30fe9059) - feat(branch): show last commit details (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

  - show the right information for not fully merged branches (it was inverted)
  - change how colors is handled in the branch component

- [`20cf330`](https://github.com/EduardoLopes/cut-branches/commit/20cf330938dadb677d6bfb71ad2c12b13b7b1f3b) - feat(branch): implement switch branch functionality with UI integration (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

### Patch Changes

- [`40c295f`](https://github.com/EduardoLopes/cut-branches/commit/40c295fb5696b9c7810086877b2a24a16fe918be) - refactor: change selected branches storage from arrays to sets for improved uniqueness handling and performance (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`227dbce`](https://github.com/EduardoLopes/cut-branches/commit/227dbce37268b72881b8221c14b8b1f600efd4aa) - Update deps (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`e8823c6`](https://github.com/EduardoLopes/cut-branches/commit/e8823c64f7332055169afdd6e37dc4b32e3fff00) - fix(branch): remove angle brackets from last commit email (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`1bb4899`](https://github.com/EduardoLopes/cut-branches/commit/1bb4899d59ae40f99df27fe7cdf740ad4d8caf37) - refactor: update search branches store (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`8b63b00`](https://github.com/EduardoLopes/cut-branches/commit/8b63b00619eb559b2a389285558c238f9a41e982) - chore: update deps (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`a5aac2f`](https://github.com/EduardoLopes/cut-branches/commit/a5aac2fe658c4c381c9aca91cfc3e82344aa2fb9) - fix(notifications-popover): reset page number on opening notification popover (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`da12892`](https://github.com/EduardoLopes/cut-branches/commit/da12892b44714d5b324046ce5b77fd7bbcb42fa7) - fix(branches): update locked and selected branches retrieval to use repository name (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`0fe69f4`](https://github.com/EduardoLopes/cut-branches/commit/0fe69f4a82d5d70a7a10f8d333c0446caed1ec15) - fix(path): update error messages to use markdown formatting (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`352310b`](https://github.com/EduardoLopes/cut-branches/commit/352310b787726d6d33ab9d1399effe9d1960a464) - feat(shell): add tauri-plugin-shell and integrate into main application (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`a9de03b`](https://github.com/EduardoLopes/cut-branches/commit/a9de03b7214bab2278b67c10df0debc31760f200) - feat: add package.json version and update footer to display it (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`0917b4b`](https://github.com/EduardoLopes/cut-branches/commit/0917b4b1c3c4f091b2b977f62722db8de17e6e59) - feat(notification): enhance delete branch notifications with markdown formatting (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`ed1f58b`](https://github.com/EduardoLopes/cut-branches/commit/ed1f58bd06fcad1317e3ef5736f6cd7df88ff291) - fix(branches-bulk-actions): correct singular/plural wording in selection info (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`6c60f85`](https://github.com/EduardoLopes/cut-branches/commit/6c60f859f23c4862d083df02478157917fd4587c) - fix(branch): change last commit date format from months to days (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`53d2278`](https://github.com/EduardoLopes/cut-branches/commit/53d2278c8ee54db88c9b211e258c176801aa26e4) - feat: add Markdown support for notifications and error messages (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`4bb148f`](https://github.com/EduardoLopes/cut-branches/commit/4bb148ff096eca376f2001001c9178c053d4f071) - chore: update deps (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`d323e7d`](https://github.com/EduardoLopes/cut-branches/commit/d323e7d224fba33245f816ff50b2a494d794f2c6) - chore: update deps (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`3051b0d`](https://github.com/EduardoLopes/cut-branches/commit/3051b0d13bfdae9d2886319a9b09d8fe58f2d356) - fix(notifications-popover): correct open state behavior (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`9a7d1f9`](https://github.com/EduardoLopes/cut-branches/commit/9a7d1f9a157b8b3211540de9f99b1588cfdcb1e6) - fix(branches): disable button while switching branche (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`725cbe7`](https://github.com/EduardoLopes/cut-branches/commit/725cbe70ef8b6d9e15a026816ea4e35a5c312200) - refactor(repositories): rename repos store and update throughout the codebase (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`430ed51`](https://github.com/EduardoLopes/cut-branches/commit/430ed51f822e1bbca24b1fb3c0b5213271bd5567) - feat(main.rs): sort branches by current status (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`c1610ae`](https://github.com/EduardoLopes/cut-branches/commit/c1610aedd9a6cdafe0dfb6430be628c38aab7459) - feat(repositories): enhance repository management and navigation logic (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`97ee9af`](https://github.com/EduardoLopes/cut-branches/commit/97ee9af93de40062b8c89a3fe46d4fb49c57c9ca) - fix: update get_current_branch command to retrieve current branch name even when HEAD is detached (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`3850909`](https://github.com/EduardoLopes/cut-branches/commit/38509098ffbd77961d6e069fd81bbc930590a149) - chore: update svelte (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`c88ef2b`](https://github.com/EduardoLopes/cut-branches/commit/c88ef2b33d7b9ba49c7a6f8651d41764891e573d) - fix(repositories): update existing repository instead of ignoring duplicates (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`d6e9591`](https://github.com/EduardoLopes/cut-branches/commit/d6e959141782c679d3e10eb8c759cb919d3f7bc9) - refactor: enhance add-button component (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`e13c49b`](https://github.com/EduardoLopes/cut-branches/commit/e13c49b8ec15fbabfb67e59fa408b07c7a4efb7a) - refactor: convert locked branches store from arrays to sets (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`b33ed37`](https://github.com/EduardoLopes/cut-branches/commit/b33ed37d70759ae100cd37ca455294a959d3220f) - chore: update deps (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`60a4b75`](https://github.com/EduardoLopes/cut-branches/commit/60a4b75926d660a11eeda7ea45af0a5118b0db69) - feat(format-date): update date format to include time (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`54c8086`](https://github.com/EduardoLopes/cut-branches/commit/54c8086021c8f92375b56a9d72bd2adf26724445) - feat(branch): update selected branches on branch switch (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`7e027f3`](https://github.com/EduardoLopes/cut-branches/commit/7e027f38836cd844fb67bbaf6ff81fc5775c19a0) - refactor: integrate repository creation logic directly in one call (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`0da518e`](https://github.com/EduardoLopes/cut-branches/commit/0da518e0320ce1c2b3ac2317ade6abc92e247455) - fix(notifications): allow custom notification id or generate a new one (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`0e08594`](https://github.com/EduardoLopes/cut-branches/commit/0e085941b458c7fe64ad115be008b8dbc1206a78) - chore: update deps (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`73d4190`](https://github.com/EduardoLopes/cut-branches/commit/73d41906c29eb6a4bbd45b351b92ef9f6278d4b6) - refactor(notifications): notification store is a class that uses svelte 5 features (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`78827bb`](https://github.com/EduardoLopes/cut-branches/commit/78827bb9e0dd4f658fe51260cbfbc2f71e4bee15) - feat(layout): add footer component and integrate last updated timestamp (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`dd8b2cf`](https://github.com/EduardoLopes/cut-branches/commit/dd8b2cf78d013bf643e6e9e864d51454b26b2157) - feat(branch): update selected branches when locking branches (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`ca3ef0d`](https://github.com/EduardoLopes/cut-branches/commit/ca3ef0d6d514854c1f9c3140081f96c51facd082) - refactor: this is a big commit that rewrite all stores (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`dfcbbd1`](https://github.com/EduardoLopes/cut-branches/commit/dfcbbd1a8b352375eabee80d8c9644e5bb0d9db2) - refactor(selected): remove deprecated selected store and integrate new selected branches store (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`afd4bc3`](https://github.com/EduardoLopes/cut-branches/commit/afd4bc32cd722d44a95a1d2e36e71bb2375d7aca) - feat(notifications-popover): tweak visuals (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

## 0.2.2

### Patch Changes

- [`7bfaf67`](https://github.com/EduardoLopes/cut-branches/commit/7bfaf677431c338450f4e2a3a7ad061d4c8b9c8b) - chore: patch changeset git changelog module (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`20e6edb`](https://github.com/EduardoLopes/cut-branches/commit/20e6edb864e75cba102d6ef64a37e5159ba6f3ee) - chore: add custom changeset commit message (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`06fb158`](https://github.com/EduardoLopes/cut-branches/commit/06fb158684efd732a42ca04ae7d4bb3f65d3f7d4) - chore: changeset output changelog in github format (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

## 0.2.1

### Patch Changes

- 0fe0a79: chore: remove unplugin-icons

## 0.2.0

### Minor Changes

- Uses pindoba ui and svelte 5 (this is a big update)
