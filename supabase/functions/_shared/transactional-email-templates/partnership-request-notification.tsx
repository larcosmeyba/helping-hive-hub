import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Help The Hive'

interface PartnershipRequestNotificationProps {
  request_type?: 'partnership' | 'press' | 'affiliate'
  name?: string
  email?: string
  organization?: string
  website?: string | null
  message?: string
}

const labelFor = (t?: string) =>
  t === 'press' ? 'Press / Media' : t === 'affiliate' ? 'Affiliate / Creator' : 'Partnership'

const PartnershipRequestNotification = ({
  request_type,
  name,
  email,
  organization,
  website,
  message,
}: PartnershipRequestNotificationProps) => {
  const typeLabel = labelFor(request_type)
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        New {typeLabel} request{organization ? ` from ${organization}` : ''}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New {typeLabel} request</Heading>
          <Text style={subtle}>Submitted via {SITE_NAME} partnerships form.</Text>

          <Section style={card}>
            <Text style={row}>
              <strong>Type:</strong> {typeLabel}
            </Text>
            {name && (
              <Text style={row}>
                <strong>Name:</strong> {name}
              </Text>
            )}
            {email && (
              <Text style={row}>
                <strong>Email:</strong> {email}
              </Text>
            )}
            {organization && (
              <Text style={row}>
                <strong>Organization:</strong> {organization}
              </Text>
            )}
            {website && (
              <Text style={row}>
                <strong>Website:</strong> {website}
              </Text>
            )}
          </Section>

          <Hr style={hr} />

          <Heading as="h2" style={h2}>
            Message
          </Heading>
          <Text style={messageStyle}>{message}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PartnershipRequestNotification,
  subject: (data: Record<string, any>) =>
    `New ${labelFor(data?.request_type)} request${data?.organization ? ` from ${data.organization}` : ''}`,
  displayName: 'Partnership request notification',
  previewData: {
    request_type: 'partnership',
    name: 'Jane Smith',
    email: 'jane@example.com',
    organization: 'Acme Foods',
    website: 'https://acme.example.com',
    message: 'We would love to explore a partnership with Help The Hive.',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}
const container: React.CSSProperties = { padding: '32px 28px', maxWidth: '600px' }
const h1: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#1f2937',
  margin: '0 0 8px',
}
const h2: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  color: '#1f2937',
  margin: '0 0 8px',
}
const subtle: React.CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0 0 24px',
}
const card: React.CSSProperties = {
  backgroundColor: '#FFF8E5',
  border: '1px solid #F2B23320',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 8px',
}
const row: React.CSSProperties = {
  fontSize: '14px',
  color: '#1f2937',
  lineHeight: '1.6',
  margin: '0 0 6px',
}
const hr: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '24px 0',
}
const messageStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#374151',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap',
  margin: 0,
}
