export const logger_js = `class Logger {
    constructor(options) {
        this.modes = options.modes || ['log', 'error', 'warn']; 
        this.depth = options.depth || 3;
    }

    log(message, params) {
        if (this.modes.includes('log')) {
            console.log(message);

            if (params) {
                console.log('Parameters:');
                console.dir(params, { depth: this.depth });
            }
        }
    }

    error(message, params, err) {
        console.log(err);
        if (!this.modes.includes('error')) return;
        let awsErrorMessage = '';

        switch (err.name) {
            case 'NoSuchKey':
                awsErrorMessage = 'NoSuchKey: The requested item does not exist in the table. Please check the key you are using and try again.';
                break;
            case 'ConditionalCheckFailedException':
                awsErrorMessage = 'ConditionalCheckFailedException: The conditional request failed. Please check the key you are using and try again.';
                break;
            case 'ResourceNotFoundException':
                awsErrorMessage = 'ResourceNotFoundException: The requested resource does not exist. Please check if the table exists and try again.';
                break;
            case 'ValidationException':
                awsErrorMessage = 'ValidationException: The input fails to satisfy the constraints specified by an AWS service. Please check the input you provided and try again.';
                break;
            case 'AccessDeniedException':
                awsErrorMessage = 'AccessDeniedException: You do not have access to the requested resource. Please check your credentials and try again.';
                break;
            case 'UnrecognizedClientException':
                awsErrorMessage = 'UnrecognizedClientException: The request signature is incorrect. Please check your credentials and try again.';
                break;
            case 'SerializationException':
                awsErrorMessage = 'SerializationException: The request failed to serialize the body correctly. Please check the request and try again.';
                break;
            case 'InternalFailure':
            case 'InternalServerError':
                awsErrorMessage = 'InternalFailure: The request processing has failed because of an unknown error, exception or failure. Please try again.';
                break;
            case 'RequestLimitExceeded':
            case 'ThrottlingException':
                awsErrorMessage = 'ThrottlingException: Too many requests have been made to the service. Please try again later.';
                break;
            case 'ProvisionedThroughputExceededException':
                awsErrorMessage = 'ProvisionedThroughputExceededException: The request rate for the table or for one or more global secondary indexes is too high. Please try again later.';
                break;
            case 'ServiceUnavailable':
                awsErrorMessage = 'ServiceUnavailable: The request has failed due to a temporary failure of the server. Please try again later.';
                break;
            case 'ResourceInUseException':
                awsErrorMessage = 'ResourceInUseException: The resource which you are attempting to change is in use. Please try again later.';
                break;
            case 'IncompleteSignature':
                awsErrorMessage = 'IncompleteSignature: The request signature does not include all of the required components. Please check your credentials and try again.';
                break;
            case 'InvalidClientTokenId':
                awsErrorMessage = 'InvalidClientTokenId: The X.509 certificate or AWS access key ID provided does not exist in our records. Please check your credentials and try again.';
                break;
            case 'MissingAuthenticationToken':
                awsErrorMessage = 'MissingAuthenticationToken: The request must contain either a valid (registered) AWS access key ID or X.509 certificate.';
                break;
            case 'AccessDenied':
                awsErrorMessage = 'AccessDenied: You do not have access to the requested resource.';
                break;
            case 'ExpiredToken':
                awsErrorMessage = 'ExpiredToken: The security token included in the request has expired.';
                break;
            case 'InvalidAccessKeyId':
                awsErrorMessage = 'InvalidAccessKeyId: The AWS access key ID provided does not exist in our records.';
                break;
            case 'InvalidSecurityToken':
                awsErrorMessage = 'InvalidSecurityToken: The security token included in the request is invalid.';
                break;
            default:
                awsErrorMessage = 'An unexpected error occurred while accessing the AWS service.';
                break;
        }

        if (message) {
            console.error(message);
        } else if (awsErrorMessage) {
            console.error(awsErrorMessage);
            console.error('Additional information: ' + err.message);
        }

        if (params) {
            console.error('Parameters:');
            console.dir(params, { depth: this.depth });
        }
    }

    warn(message, params) {
        if (this.modes.includes('warn')) {
            console.warn(message);

            if (params) {
                console.warn('Parameters:');
                console.dir(params, { depth: this.depth });
            }
        }
    }
}

module.exports = { Logger };
`

export const logger_d_ts = `export declare interface ILogger {
    log(message: any, params: any): void;
    error(message: string, params: any, err: Error): void;
    warn(message: any, params: any): void;
}

export enum LoggerMode {
    LOG = 'log',
    ERROR = 'error',
    WARN = 'warn'
}

export declare class Logger implements ILogger {
    constructor(options: { modes: string[] });
    log(message: any, params: any): void;
    error(message: string, params: any, err: Error): void;
    warn(message: any, params: any): void;
}
`
