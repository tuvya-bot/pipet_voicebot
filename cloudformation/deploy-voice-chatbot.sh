#!/bin/bash

# Voice Chatbot Infrastructure Deployment Script
# This script deploys the complete voice chatbot infrastructure using CloudFormation

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
PROJECT_NAME="voice-chatbot"
ENVIRONMENT="dev"
REGION="us-east-1"
STACK_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"

# Stack names
INFRASTRUCTURE_STACK="${STACK_PREFIX}-infrastructure"
COMPUTE_STACK="${STACK_PREFIX}-compute"
API_STACK="${STACK_PREFIX}-api"

# Template files (relative to script directory)
INFRASTRUCTURE_TEMPLATE="voice-chatbot-infrastructure.yaml"
COMPUTE_TEMPLATE="voice-chatbot-compute.yaml"
API_TEMPLATE="voice-chatbot-api.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if AWS CLI is configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi

    print_success "AWS CLI is configured"
}

# Function to validate CloudFormation templates
validate_templates() {
    print_status "Validating CloudFormation templates..."
    
    templates=(
        "$INFRASTRUCTURE_TEMPLATE"
        "$COMPUTE_TEMPLATE"
        "$API_TEMPLATE"
    )
    
    for template in "${templates[@]}"; do
        if [[ ! -f "$template" ]]; then
            print_error "Template file $template not found in $(pwd)"
            exit 1
        fi
        
        print_status "Validating $template..."
        if aws cloudformation validate-template --template-body file://$template --region $REGION > /dev/null; then
            print_success "$template is valid"
        else
            print_error "$template validation failed"
            exit 1
        fi
    done
}

# Function to check if stack exists
stack_exists() {
    local stack_name=$1
    aws cloudformation describe-stacks --stack-name $stack_name --region $REGION &> /dev/null
}

# Function to wait for stack operation to complete
wait_for_stack() {
    local stack_name=$1
    local operation=$2
    
    print_status "Waiting for $operation to complete for stack $stack_name..."
    
    if [[ "$operation" == "create" ]]; then
        aws cloudformation wait stack-create-complete --stack-name $stack_name --region $REGION
    elif [[ "$operation" == "update" ]]; then
        aws cloudformation wait stack-update-complete --stack-name $stack_name --region $REGION
    elif [[ "$operation" == "delete" ]]; then
        aws cloudformation wait stack-delete-complete --stack-name $stack_name --region $REGION
    fi
    
    if [[ $? -eq 0 ]]; then
        print_success "$operation completed successfully for $stack_name"
    else
        print_error "$operation failed for $stack_name"
        exit 1
    fi
}

# Function to deploy infrastructure stack
deploy_infrastructure() {
    print_status "Deploying infrastructure stack..."
    
    local parameters="ParameterKey=Environment,ParameterValue=$ENVIRONMENT ParameterKey=ProjectName,ParameterValue=$PROJECT_NAME"
    
    if stack_exists $INFRASTRUCTURE_STACK; then
        print_status "Stack $INFRASTRUCTURE_STACK exists, updating..."
        aws cloudformation update-stack \
            --stack-name $INFRASTRUCTURE_STACK \
            --template-body file://voice-chatbot-infrastructure.yaml \
            --parameters $parameters \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $REGION
        wait_for_stack $INFRASTRUCTURE_STACK "update"
    else
        print_status "Creating new stack $INFRASTRUCTURE_STACK..."
        aws cloudformation create-stack \
            --stack-name $INFRASTRUCTURE_STACK \
            --template-body file://voice-chatbot-infrastructure.yaml \
            --parameters $parameters \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $REGION
        wait_for_stack $INFRASTRUCTURE_STACK "create"
    fi
}

# Function to deploy compute stack
deploy_compute() {
    print_status "Deploying compute stack..."
    
    local parameters="ParameterKey=Environment,ParameterValue=$ENVIRONMENT ParameterKey=ProjectName,ParameterValue=$PROJECT_NAME"
    
    if stack_exists $COMPUTE_STACK; then
        print_status "Stack $COMPUTE_STACK exists, updating..."
        aws cloudformation update-stack \
            --stack-name $COMPUTE_STACK \
            --template-body file://voice-chatbot-compute.yaml \
            --parameters $parameters \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $REGION
        wait_for_stack $COMPUTE_STACK "update"
    else
        print_status "Creating new stack $COMPUTE_STACK..."
        aws cloudformation create-stack \
            --stack-name $COMPUTE_STACK \
            --template-body file://voice-chatbot-compute.yaml \
            --parameters $parameters \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $REGION
        wait_for_stack $COMPUTE_STACK "create"
    fi
}

# Function to deploy API stack
deploy_api() {
    print_status "Deploying API stack..."
    
    local parameters="ParameterKey=Environment,ParameterValue=$ENVIRONMENT ParameterKey=ProjectName,ParameterValue=$PROJECT_NAME"
    
    if stack_exists $API_STACK; then
        print_status "Stack $API_STACK exists, updating..."
        aws cloudformation update-stack \
            --stack-name $API_STACK \
            --template-body file://voice-chatbot-api.yaml \
            --parameters $parameters \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $REGION
        wait_for_stack $API_STACK "update"
    else
        print_status "Creating new stack $API_STACK..."
        aws cloudformation create-stack \
            --stack-name $API_STACK \
            --template-body file://voice-chatbot-api.yaml \
            --parameters $parameters \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $REGION
        wait_for_stack $API_STACK "create"
    fi
}

# Function to delete all stacks
delete_stacks() {
    print_warning "This will delete all voice chatbot infrastructure. Are you sure? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_status "Deletion cancelled"
        exit 0
    fi
    
    # Delete in reverse order
    stacks=($API_STACK $COMPUTE_STACK $INFRASTRUCTURE_STACK)
    
    for stack in "${stacks[@]}"; do
        if stack_exists $stack; then
            print_status "Deleting stack $stack..."
            aws cloudformation delete-stack --stack-name $stack --region $REGION
            wait_for_stack $stack "delete"
        else
            print_warning "Stack $stack does not exist"
        fi
    done
    
    print_success "All stacks deleted successfully"
}

# Function to show stack outputs
show_outputs() {
    print_status "Retrieving stack outputs..."
    
    stacks=($INFRASTRUCTURE_STACK $COMPUTE_STACK $API_STACK)
    
    for stack in "${stacks[@]}"; do
        if stack_exists $stack; then
            print_status "Outputs for $stack:"
            aws cloudformation describe-stacks \
                --stack-name $stack \
                --region $REGION \
                --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue,Description]' \
                --output table
            echo
        else
            print_warning "Stack $stack does not exist"
        fi
    done
}

# Function to show stack status
show_status() {
    print_status "Checking stack status..."
    
    stacks=($INFRASTRUCTURE_STACK $COMPUTE_STACK $API_STACK)
    
    for stack in "${stacks[@]}"; do
        if stack_exists $stack; then
            status=$(aws cloudformation describe-stacks \
                --stack-name $stack \
                --region $REGION \
                --query 'Stacks[0].StackStatus' \
                --output text)
            print_status "$stack: $status"
        else
            print_warning "$stack: DOES_NOT_EXIST"
        fi
    done
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  deploy      Deploy all stacks (infrastructure, compute, api)"
    echo "  delete      Delete all stacks"
    echo "  validate    Validate CloudFormation templates"
    echo "  outputs     Show stack outputs"
    echo "  status      Show stack status"
    echo "  help        Show this help message"
    echo
    echo "Options:"
    echo "  -e, --environment ENV    Set environment (default: dev)"
    echo "  -r, --region REGION      Set AWS region (default: us-east-1)"
    echo "  -p, --project PROJECT    Set project name (default: voice-chatbot)"
    echo
    echo "Examples:"
    echo "  $0 deploy"
    echo "  $0 deploy --environment prod --region us-west-2"
    echo "  $0 delete"
    echo "  $0 outputs"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -p|--project)
            PROJECT_NAME="$2"
            shift 2
            ;;
        deploy|delete|validate|outputs|status|help)
            COMMAND="$1"
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Update stack names with new parameters
STACK_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"
INFRASTRUCTURE_STACK="${STACK_PREFIX}-infrastructure"
COMPUTE_STACK="${STACK_PREFIX}-compute"
API_STACK="${STACK_PREFIX}-api"

# Main execution
case "${COMMAND:-help}" in
    deploy)
        print_status "Starting deployment for environment: $ENVIRONMENT, region: $REGION"
        check_aws_cli
        validate_templates
        deploy_infrastructure
        deploy_compute
        deploy_api
        print_success "Deployment completed successfully!"
        echo
        show_outputs
        ;;
    delete)
        check_aws_cli
        delete_stacks
        ;;
    validate)
        validate_templates
        print_success "All templates are valid"
        ;;
    outputs)
        check_aws_cli
        show_outputs
        ;;
    status)
        check_aws_cli
        show_status
        ;;
    help)
        show_usage
        ;;
    *)
        print_error "Unknown command: ${COMMAND}"
        show_usage
        exit 1
        ;;
esac
