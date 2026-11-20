data "ibm_resource_group" "this" {
  name = var.resource_group_name
}

# IBM Cloudant: application database (IAM authentication only).
resource "ibm_cloudant" "todo" {
  name              = var.cloudant_name
  location          = var.region
  plan              = var.cloudant_plan
  resource_group_id = data.ibm_resource_group.this.id
  capacity          = var.cloudant_capacity
  tags              = var.tags

  timeouts {
    create = "15m"
    update = "15m"
    delete = "15m"
  }
}

# The server creates its databases and indexes at startup (CloudantAppRepository.init),
# so the key needs the Manager role.
resource "ibm_resource_key" "cloudant" {
  name                 = "${var.cloudant_name}-manager-key"
  role                 = "Manager"
  resource_instance_id = ibm_cloudant.todo.id
  tags                 = var.tags
}

# watsonx Orchestrate: hosts the todo_assistant agent. Agent import stays in orchestrate/deploy.sh.
resource "ibm_resource_instance" "orchestrate" {
  name              = var.orchestrate_name
  service           = "watsonx-orchestrate"
  plan              = var.orchestrate_plan
  location          = var.region
  resource_group_id = data.ibm_resource_group.this.id
  tags              = var.tags

  timeouts {
    create = "15m"
    update = "15m"
    delete = "15m"
  }
}
