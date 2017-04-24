import Link from 'next/link';
import { parse } from 'url';

export default props => {
  let id: string = props.id;
  let alias: string;
  if (id.startsWith('http://benangmerah.net/')) {
    alias = parse(id).path;
  }
  else {
    alias = `/resource/${encodeURIComponent(id)}`;
  }

  return (
    <Link href={{ pathname: '/resource', query: { id } }} as={alias}>
      {props.children}
    </Link>
  );
}