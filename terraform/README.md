# Terraform: IBM Cloud services for the ToDo app

Provisions the IBM Cloud services the app depends on:

- **IBM Cloudant** instance plus a `Manager` IAM service key. The server creates its databases and indexes at startup (`CloudantAppRepository.init`), so Terraform does not create them.
- **IBM watsonx Orchestrate** instance. The agent, toolkit and connection are imported afterwards with [`orchestrate/deploy.sh`](../orchestrate/deploy.sh).

Region, plans and names are variables with no defaults. You supply them in `terraform.tfvars`.

## Prerequisites

- Terraform >= 1.5.0
- An existing IBM Cloud resource group
- An IBM Cloud API key with permission to create Cloudant and watsonx Orchestrate instances, exported in your shell (never stored in files):

```bash
export IC_API_KEY="<your-ibm-cloud-api-key>"
```

## Usage

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # edit values; file is git-ignored
terraform init
terraform plan
terraform apply
```

## Wire the outputs into the app

Cloudant values are sensitive. Read them and place them in `.env.openshift` (git-ignored):

```bash
terraform output -raw cloudant_url      # -> CLOUDANT_URL
terraform output -raw cloudant_apikey   # -> CLOUDANT_APIKEY
```

Remove `CLOUDANT_USERNAME` and `CLOUDANT_PASSWORD` from `.env.openshift` when using the API key. Then run `make deploy-dev` from the repository root.

For watsonx Orchestrate:

```bash
orchestrate env add -n my-saas -u "$(terraform output -raw orchestrate_api_url)"
orchestrate env activate my-saas --api-key "$IC_API_KEY"
```

Then follow [`orchestrate/README.md`](../orchestrate/README.md).

## State

Terraform state contains the service key secrets. State and `terraform.tfvars` are git-ignored. Use a protected remote backend if you share this configuration with others.

## Destroy

```bash
terraform destroy
```
