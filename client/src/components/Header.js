import React from "react";
import { Box, Heading, Text, Link } from "rimble-ui";

class Header extends React.Component {
  render() {
    return (
      <Box bg="primary" p={3} justifyContent="center" flexDirection="column">
        <Box maxWidth="600px" mx="auto">
          <Link href="/">
            <Heading fontSize={4} color={"white"}>Shy Panda</Heading>
            <Text italic color={"white"}>A donation platform for animal protection organizations</Text>
          </Link>
        </Box>
      </Box>
    );
  }
}

export default Header;