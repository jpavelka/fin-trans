import { Navbar, Nav } from "react-bootstrap";
import { Link } from "react-router-dom";

const NavMenu = () => {
  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Navbar.Brand as={Link} to="/">
        Transactions
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="mr-auto">
          <Nav.Link as={Link} to="/upload">
            Upload
          </Nav.Link>
          <Nav.Link as={Link} to="/edit">
            Edit
          </Nav.Link>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default NavMenu;
