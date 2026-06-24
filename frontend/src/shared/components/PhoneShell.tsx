import React from 'react';
import styles from './PhoneShell.module.css';

interface Props {
  children: React.ReactNode;
}

export function PhoneShell({ children }: Props) {
  return <div className={styles.shell}>{children}</div>;
}
