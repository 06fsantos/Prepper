# Merging Quartz upstream

Prepper's repo **is** a Quartz clone. Quartz is configured as the git remote `upstream`
and its releases are merged in periodically;
[ADR 0002](adr/0002-quartz-as-the-build-pipeline.md) is the decision, and the reason is
that divergence is a maintenance cost this project chose not to take on.

That choice only pays off if the merge stays cheap, which it does exactly as long as our
code stays out of Quartz's files. See [`prepper/README.md`](../prepper/README.md) for
where our code goes and which five files outside `prepper/` we do edit.

## Orientation

- **Remote**: `upstream` → `https://github.com/jackyzha0/quartz.git`
- **Branch we track**: `v5`, Quartz's default branch.
- **First merge**: the commit _Merge Quartz v5 upstream as the build pipeline_. Prepper's
  own material (spec, ADRs, agent skills) was committed first, so that merge reads as
  purely additive and `git log --first-parent` stays a history of our work.
- **`docs/` is shared.** Quartz's documentation vault lives there too. Ours is
  `docs/adr/`, `docs/agents/`, and this file; everything else under `docs/` is upstream's
  and is left alone. It is a little untidy, and it is untidy _on purpose_ — moving
  upstream's docs out of the way would be a divergence that conflicts on every merge.
- **One upstream file is deleted, not edited: `.github/dependabot.yml`.** Quartz schedules
  weekly npm and github-actions version updates with it. On our fork that is a PR against a
  dependency tree we do not own and did not choose, so the file is removed rather than
  emptied. It is the one deliberate deletion from upstream's tree, and it is the one place a
  merge can quietly undo our decision: a merge that restores it will do so silently, because
  a delete-versus-modify conflict only surfaces if upstream touched the file that cycle.
  **After every merge, check it is still gone.**

## The procedure

```sh
git fetch upstream
git log --oneline HEAD..upstream/v5        # what is coming
git checkout -b merge-upstream-$(date +%Y-%m-%d)
git merge upstream/v5
```

Then, in order:

1. **Resolve conflicts.** They should only ever appear in the five files
   `prepper/README.md` names. If a conflict lands anywhere under `quartz/`, something of
   ours leaked into upstream's tree — fix that, not the conflict.
   - `quartz.config.yaml` is **ours**, and upstream never edits it. It cannot conflict.
     What it can do is go _stale_: diff it against `quartz.config.default.yaml`
     (`git diff HEAD:quartz.config.default.yaml upstream/v5:quartz.config.default.yaml`)
     to see which plugins, options, and defaults changed, and port across what we want.
     This is the step that is easy to skip and expensive to have skipped.
   - `package.json` conflicts on dependency and script lines. Keep upstream's versions;
     re-add our entries (`build`, `serve`, `ulid`, our `test` concurrency flag, and our
     devDependencies).
   - `.prettierignore` conflicts as a plain append. Keep both sides.
   - `tsconfig.json` conflicts in `include`. Keep upstream's entries and re-add
     `prepper/**` and `scripts/**`, or `npm run check` goes quietly blind to our code.
2. **Reinstall and re-resolve plugins.** `npm install`. The `@quartz-community/*` packages
   are on un-versioned `0.1.x` and are read at HEAD, so a merge can move them under us.
3. **Run the checks**, in this order, because each one localises a different failure:
   ```sh
   npx tsc --noEmit     # our plugins still compile against upstream's types
   npm test             # seam 1: the vault still builds into the site we expect
   npm run build        # the real vault, end to end
   ```
4. **Read the diff of the emitted site**, not just the test results. The suite asserts on
   the behaviour we decided to care about; a merge can change everything else — layout,
   class names, script bundling — without a single test noticing. Build before and after
   and diff `public/`.
5. **Merge to `main` with a merge commit.** Do not squash: squashing throws away the
   ancestry that makes the _next_ merge three-way rather than a manual diff.

## When upstream breaks us

The failure is almost always one of two things, and they are worth telling apart:

- **A plugin contract moved** — an `order` we sit next to changed, a hook signature
  changed, a `data.hProperties` key stopped surviving. Fix it in our plugin. This is the
  cost the ADR agreed to pay.
- **A mechanism we depend on stopped being true.** The three in
  [ticket 02](../.scratch/prepper-build/issues/02-spike-the-unrun-mechanisms.md) are the
  ones to watch, because two of them fail _quietly_: a Workshop note's exclusion from the
  build's corpus is what makes the Workshop boundary airtight, and the report's exclusion
  from the link graph is what stops the hygiene section erasing itself on the second
  build. All three are asserted in
  [`prepper/testing/mechanisms.test.ts`](../prepper/testing/mechanisms.test.ts), which is
  the tripwire and the first file to read when a merge breaks something; the findings are
  written up in
  [`.scratch/prepper-build/research/`](../.scratch/prepper-build/research/). A failure
  there is an **ADR amendment**, not a workaround invented on the spot.
- **Layout resolution placed something we did not ask for.** The loader names a local plugin
  after its source path's basename and, for an entry with no `layout:` block, looks that name
  up in a component registry shared with every installed package — so a name collision places
  a component nobody configured, without a warning.
  [`prepper/testing/layout.test.ts`](../prepper/testing/layout.test.ts) is the tripwire: it
  counts the graph panel on a page of every type, and
  [`prepper/README.md`](../prepper/README.md) says what to do about a collision.
- **The frame's own shape changed.** Two facts about
  `quartz/components/frames/DefaultFrame.tsx` and `quartz/styles/variables.scss` are
  load-bearing since the right column was retired: components in the `footer` layout position
  are rendered as **direct children of `#quartz-body`** rather than inside `.center`, which is
  the only reason the table of contents can be a grid item in the margin; and the desktop grid
  names its third area `grid-sidebar-right`, which is the area that list is placed in.
  `prepper/reading/reading.test.ts` and `prepper/testing/layout.test.ts` assert both, and a
  merge that renames the area or reparents the position fails them rather than silently putting
  the list back in the flow.

## What is deliberately not done

- **No fork or patch of core Quartz.** The vendoring line is drawn once: core stays a
  remote, and an altered _community_ plugin (the search component) is vendored in-tree
  under `prepper/`.
- **No cherry-picking upstream commits.** Merge the branch. Cherry-picks leave the
  histories unrelated and make every later merge worse.
- **No rebase of `main` onto upstream.** It would rewrite the shared history the merge
  base is computed from.
