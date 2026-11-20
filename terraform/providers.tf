# Authentication: export IC_API_KEY in the environment. Never put the key in a file.
provider "ibm" {
  region = var.region
}
