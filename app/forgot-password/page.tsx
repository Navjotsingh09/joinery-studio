import MarketingShell from '@/components/MarketingShell';
import AccountLayout from '@/components/AccountLayout';
import AccountForm from '@/components/AccountForm';
export const metadata={title:'Let’s get you back in.'+' | Joinery Studio'};
export default function Page(){return <MarketingShell><AccountLayout eyebrow='YOUR ACCOUNT' title='Let’s get you back in.' intro='Request a secure password reset link.'><AccountForm mode="forgot"/></AccountLayout></MarketingShell>}
