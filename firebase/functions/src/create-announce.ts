import { autoID, CreateAnnounceParams } from 'announsing-shared';
import * as admin from 'firebase-admin';
import { CallableContext } from 'firebase-functions/lib/providers/https';
import { announceMetaHash, AnnounceMeta_FS, Announce_FS } from './firestore';

export const callCreateAnnounce = async (
  params: CreateAnnounceParams,
  context: CallableContext,
  adminApp: admin.app.App,
): Promise<void> => {
  const uid = context.auth?.uid;
  return createAnnounce(params, uid, adminApp);
};

const createAnnounce = async (
  params: CreateAnnounceParams,
  uid: string | undefined,
  adminApp: admin.app.App,
): Promise<void> => {
  if (!uid) {
    throw new Error('missing uid');
  }
  if (!params.name) {
    throw new Error('missing name');
  }
  if (params.name.length > 50) {
    throw new Error('name is too long');
  }
  if (params.desc && params.desc.length > 500) {
    throw new Error('desc is too long');
  }

  const dataMeta: AnnounceMeta_FS = {
    name: params.name.trim(),
    ...(!!params.desc && { desc: params.desc.trim() }),
    cT: admin.firestore.FieldValue.serverTimestamp(),
  };

  const id = autoID();
  const mid = announceMetaHash(dataMeta);

  const data: Announce_FS = {
    id,
    users: { [uid]: { own: true } },
    mid,
    uT: admin.firestore.FieldValue.serverTimestamp(),
  };

  const firestore = adminApp.firestore();
  const batch = firestore.batch();
  batch.create(firestore.doc(`announces/${id}`), data);
  batch.create(firestore.doc(`announces/${id}/meta/${mid}`), dataMeta);
  await batch.commit();
  console.log('CREATE ANNOUNCE', data, dataMeta);
};