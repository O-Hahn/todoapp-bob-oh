output "cloudant_url" {
  description = "Cloudant service URL. Use as CLOUDANT_URL."
  value       = ibm_resource_key.cloudant.credentials["url"]
  sensitive   = true
}

output "cloudant_apikey" {
  description = "Cloudant IAM API key. Use as CLOUDANT_APIKEY."
  value       = ibm_resource_key.cloudant.credentials["apikey"]
  sensitive   = true
}

output "cloudant_crn" {
  description = "CRN of the Cloudant instance."
  value       = ibm_cloudant.todo.crn
}

output "orchestrate_guid" {
  description = "GUID of the watsonx Orchestrate instance."
  value       = ibm_resource_instance.orchestrate.guid
}

output "orchestrate_crn" {
  description = "CRN of the watsonx Orchestrate instance."
  value       = ibm_resource_instance.orchestrate.crn
}

output "orchestrate_api_url" {
  description = "API URL for 'orchestrate env add -u'."
  value       = "https://api.${var.region}.watson-orchestrate.cloud.ibm.com/instances/${ibm_resource_instance.orchestrate.guid}"
}
