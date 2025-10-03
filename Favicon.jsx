import { useEffect } from 'react';
import logoImg from '../../assets/logo.jpg';

export default function Favicon() {
  useEffect(() => {
    const rels = ['icon', 'shortcut icon'];
    rels.forEach((rel) => {
      let link = document.querySelector(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      link.setAttribute('href', logoImg);
      link.setAttribute('type', 'image/jpeg');
    });

    return () => {
      // optional cleanup: leave favicon in place
    };
  }, []);

  return null;
}
