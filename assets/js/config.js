/* Public site configuration. Everything here ships to the browser, so never put
   secrets, database URLs or private API keys in this file. */
window.IP_CONFIG = {
  // Shows the "Preview" banner. Set to false for the public launch.
  preview: false,

  // Where the early-access form posts. "netlify" uses Netlify Forms (approved by matt,
  // 12 Nov 2026). Leave empty to disable. While empty, the form validates but tells the visitor plainly
  // that nothing was sent. See website/README.md, "Connecting the form".
  formEndpoint: "netlify",

  // Saved example shown in the walkthrough. Files live in data/examples/.
  // "draft" examples render only while preview is true, with a "Draft" label.
  // "approved" examples render on the public site. See data/example.schema.md.
  demoExample: "data/examples/gta6-release-timing.json"
};
