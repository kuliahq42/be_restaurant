import Unauthorized from "../_components/unauthorized";

export const metadata = { title: "Unauthorized · Restaurant Admin" };

export default function UnauthorizedPage() {
  return (
    <Unauthorized
      description="You are signed in, but this area is limited to other roles. Contact your Master account if you believe you need access."
    />
  );
}
