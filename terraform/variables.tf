variable "region" {
  description = "IBM Cloud region for both services (for example us-south, eu-de)."
  type        = string

  validation {
    condition     = length(trimspace(var.region)) > 0
    error_message = "region must not be empty."
  }
}

variable "resource_group_name" {
  description = "Name of an existing IBM Cloud resource group that will contain the services."
  type        = string

  validation {
    condition     = length(trimspace(var.resource_group_name)) > 0
    error_message = "resource_group_name must not be empty."
  }
}

variable "cloudant_name" {
  description = "Name of the Cloudant service instance."
  type        = string

  validation {
    condition     = length(trimspace(var.cloudant_name)) > 0
    error_message = "cloudant_name must not be empty."
  }
}

variable "cloudant_plan" {
  description = "Cloudant plan (for example lite, standard, standard-gen2)."
  type        = string

  validation {
    condition     = length(trimspace(var.cloudant_plan)) > 0
    error_message = "cloudant_plan must not be empty."
  }
}

variable "cloudant_capacity" {
  description = "Cloudant throughput capacity. Leave null to use the provider default. Not supported for the lite plan."
  type        = number
  default     = null
}

variable "orchestrate_name" {
  description = "Name of the watsonx Orchestrate service instance."
  type        = string

  validation {
    condition     = length(trimspace(var.orchestrate_name)) > 0
    error_message = "orchestrate_name must not be empty."
  }
}

variable "orchestrate_plan" {
  description = "watsonx Orchestrate plan (for example lite, essentials-agentic-mau, standard-agentic-mau)."
  type        = string

  validation {
    condition     = length(trimspace(var.orchestrate_plan)) > 0
    error_message = "orchestrate_plan must not be empty."
  }
}

variable "tags" {
  description = "Optional resource tags applied to both service instances."
  type        = list(string)
  default     = []
}
