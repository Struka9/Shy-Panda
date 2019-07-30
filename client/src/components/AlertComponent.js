import React from 'react';
import { Alert } from 'react-bootstrap';

const AlertComponent = ({ variant, message, onClose = () => { console.log("Closed alert")} }) => {
    let heading;
    if (variant === "success") {
        heading = "Success!";
    } else if (variant === "danger") {
        heading = "Oh Snap, you got an error";
    }

    return (<Alert variant={variant} onClose={onClose} dismissible>
        <Alert.Heading>{heading}</Alert.Heading>
        <p>
            {message}
        </p>
    </Alert>)
}

export default AlertComponent;