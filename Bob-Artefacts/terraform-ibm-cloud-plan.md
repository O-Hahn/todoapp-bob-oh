# Terraform deployment for IBM Cloud: Cloudant and watsonx Orchestrate

## Top-level overview

**Goal:** Provide a `terraform/` directory that provisions the two IBM Cloud services the ToDo app depends on:

1. **IBM Cloudant** is the app database. The server reads `CLOUDANT_URL` and `CLOUDANT_APIKEY` (see `server/src/config.ts`, `server/src/db/cloudant.repository.ts`).
2. **IBM watsonx Orchestrate** hosts the `todo_assistant` agent (see `orchestrate/`).

**Decisions confirmed with the user:**
- Region and plans are input variables with **no hard-coded defaults**. The user supplies them in a `terraform.tfvars` file.
- Terraform provisions both service instances and a Cloudant IAM service key.
- Terraform does **not** create the Cloudant databases. `CloudantAppRepository.init()` already calls `putDatabase` and `postIndex` at startup. The service key therefore needs the `Manager` role.
- Outputs are marked sensitive and the user copies them manually into `.env.openshift`. There is no Makefile helper.
- The watsonx Orchestrate instance is provisioned only. Agent, toolkit and connection import stays in `orchestrate/deploy.sh`.

**Approach:**
- Use direct provider resources from the `IBM-Cloud/ibm` provider, not wrapper modules, to keep the change minimal.
- Cloudant: `ibm_cloudant` and `ibm_resource_key`.
- watsonx Orchestrate: `ibm_resource_instance`.
- Optionally create a resource group, or look up an existing one via a variable.
- The IBM Cloud API key comes from the `IC_API_KEY` environment variable, never from files.
- This follows the project security rules: no secrets in code or git, sensitive outputs, latest stable provider, tfstate and tfvars git-ignored.

**Non-goals:** remote state backend, Schematics, CI pipeline, OpenShift cluster provisioning, creating Cloudant databases, importing the wxO agent.

## Sub-tasks

### 1. Terraform scaffold and provider configuration
- **Intent:** Establish the `terraform/` root module with a pinned, current provider and variable-driven configuration.
- **Expected outcomes:**
  - `terraform init` and `terraform validate` succeed.
  - No default values for region or plans.
  - No credentials in files.
- **Todo list:**
  1. Create `terraform/versions.tf` with a `required_version` and `IBM-Cloud/ibm` pinned to the latest stable release. Verify the version and maintenance status at implementation time, per the security rule.
  2. Create `terraform/providers.tf` with an `ibm` provider that takes `region` from a variable. The API key comes from the `IC_API_KEY` environment variable.
  3. Create `terraform/variables.tf` with these variables, all without defaults:
     - `region`
     - `resource_group_name`
     - `cloudant_name`
     - `cloudant_plan`
     - `cloudant_capacity`, optional
     - `orchestrate_name`
     - `orchestrate_plan`
     - `tags`, optional
  4. Add validation blocks for non-empty strings.
- **Relevant context:** The provider docs for `ibm_cloudant` list `name`, `location`, `plan` and `resource_group_id` as the main arguments. The wxO module README (`terraform-ibm-modules/terraform-ibm-watsonx-orchestrate`) shows plan values `lite`, `essentials-agentic-mau` and `standard-agentic-mau`, and requires `ibm >= 1.79.0`.
- **Status:** `[x] done`

### 2. Resource group and Cloudant resources
- **Intent:** Provision Cloudant and credentials the app can use for IAM auth.
- **Expected outcomes:**
  - A Cloudant instance exists in the chosen region and plan.
  - A service key with the `Manager` role exists.
  - The Cloudant URL and API key are available as sensitive outputs.
- **Todo list:**
  1. Add a `data "ibm_resource_group"` lookup by name in `terraform/main.tf` (confirmed: look up an existing group, do not create one).
  2. Add an `ibm_cloudant` resource using the variables. Use IAM-only auth, so do not set `legacy_credentials`.
  3. Add an `ibm_resource_key` with role `Manager`, referencing the Cloudant instance.
  4. Check whether `service_endpoints` should be exposed as a variable. Public is needed for OpenShift on ROSA to reach it.
- **Relevant context:**
  - `server/src/db/cloudant.repository.ts:337-356` uses `IamAuthenticator` when `CLOUDANT_APIKEY` is set.
  - `server/src/db/cloudant.repository.ts:283-334` creates the 4 databases and the Mango indexes.
  - `.env.example` documents the expected variables.
- **Status:** `[x] done`

### 3. watsonx Orchestrate instance
- **Intent:** Provision the wxO service instance that the existing `orchestrate/deploy.sh` targets.
- **Expected outcomes:**
  - A wxO instance exists in the chosen region and plan.
  - The GUID, CRN and dashboard URL are exposed.
- **Todo list:**
  1. Add an `ibm_resource_instance` in `terraform/main.tf` with service `watsonx-orchestrate`, plan from the variable, and location from `region`.
  2. Verify the exact service name and plan identifiers against the provider docs and the wxO module source before writing.
- **Relevant context:**
  - `orchestrate/README.md` and `orchestrate/deploy.sh` expect `orchestrate env add -u https://api.<region>.watson-orchestrate.cloud.ibm.com/instances/<INSTANCE_ID>`.
  - The GUID output feeds that URL.
- **Status:** `[x] done`

### 4. Outputs, example variables, and repo hygiene
- **Intent:** Make results easy to consume and prevent secret leakage.
- **Expected outcomes:**
  - Sensitive outputs for the Cloudant URL and API key.
  - Non-sensitive outputs for the wxO instance GUID and the composed API URL.
  - `terraform.tfvars` and state files are ignored by git.
- **Todo list:**
  1. Create `terraform/outputs.tf`:
     - `cloudant_url` and `cloudant_apikey`, both `sensitive = true`, taken from the service key credentials.
     - `orchestrate_guid`, `orchestrate_crn`, `orchestrate_dashboard_url`.
     - `orchestrate_api_url`, composed from `region` and the GUID.
  2. Create `terraform/terraform.tfvars.example` with placeholder values only.
  3. Update `.gitignore` with `*.tfstate*`, `.terraform/`, `terraform.tfvars` and `*.auto.tfvars`. Keep `.terraform.lock.hcl` committed.
- **Relevant context:** The existing `.gitignore` ignores `.env.*` already. The rules require a `.gitignore` and no committed secrets.
- **Status:** `[x] done`

### 5. Documentation and validation
- **Intent:** Tell the user how to run the deployment and how to wire outputs into the existing flow.
- **Expected outcomes:**
  - `terraform/README.md` documents the workflow.
  - `terraform fmt -check` and `terraform validate` pass.
- **Todo list:**
  1. Write `terraform/README.md` covering prerequisites, `export IC_API_KEY`, copying `terraform.tfvars.example`, then `init`, `plan`, `apply`.
  2. In the README, explain how to read sensitive outputs with `terraform output -raw cloudant_apikey` and where to place them (`CLOUDANT_URL`, `CLOUDANT_APIKEY` in `.env.openshift`). Then refer to `make deploy-dev`.
  3. In the README, explain how to use `orchestrate_api_url` with `orchestrate env add`. Then refer to `orchestrate/deploy.sh`.
  4. Add a one-line pointer in the main `README.md`.
  5. Run `terraform fmt -check` and `terraform validate`. If the Terraform CLI is unavailable, say so explicitly.
- **Relevant context:** `README.md:154` and `orchestrate/README.md:9` contain the `orchestrate env add` instructions. `Makefile` target `deploy-dev` reads `.env.openshift`.
- **Status:** `[x] done`

## Open points to confirm during implementation
- Resource group: confirmed as lookup of an existing group by name.
- The exact `ibm_resource_instance` service name and plan strings for watsonx Orchestrate. These are verified against provider docs because the plan depends on the user's tfvars.
- The `Manager` role is needed for `putDatabase` and `postIndex`. A narrower role would break startup.
