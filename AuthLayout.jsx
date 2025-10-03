import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import Logo from '../common/Logo.jsx';

const AuthLayout = ({ title, subtitle, children, footer }) => {
  return (
    <Container className="auth-container">
      <Row className="justify-content-center w-100 mx-0">
        <Col md={6} lg={5} xl={4} className="px-2">
          <Card className="auth-card shadow-lg border-0">
            <Card.Body className="p-5">
              {(title || subtitle) && (
                <div className="text-center mb-4">
                  <Logo size={64} className="auth-logo mb-3" />
                  {title && <h2 className="auth-title mb-1">{title}</h2>}
                  {subtitle && <p className="text-muted mb-0">{subtitle}</p>}
                </div>
              )}
              {children}

              {footer && (
                <div className="mt-4 text-center">
                  {footer}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AuthLayout;
