import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { NextApiRequest, NextApiResponse } from 'next'
import { UserCredential, getAuth, signInAnonymously} from 'firebase/auth';
import { dbf } from '@flow/reader/firebase/firebaseApp';

async function sendData(req: NextApiRequest, res: NextApiResponse){
  if (req.method === 'POST') {
    if(req.headers['content-type'] === 'application/json'){
      try {
        await setDoc(
          doc(
            dbf,
            req.body.collection,
            req.body.document,
          ),
          req.body.data,
        )
        return res.status(200).json({ message: 'Document ' + req.body.document +  ' submitted to database!' })
      }
      catch (err) {
        throw err
      }
    }
  }
  else if(req.method === 'PUT'){
    if(req.headers['content-type'] === 'application/json'){
      try {
        await updateDoc(
          doc(
            dbf,
            req.body.collection,
            req.body.document,
          ),
          req.body.data,
        )
        return res.status(200).json({ message: 'Document ' + req.body.document +  ' updated!' })
      }
      catch (err) {
        throw err
      }
    }
  }
}

export default async function DataHandler(req: NextApiRequest, res: NextApiResponse){
  try{
    if(getAuth().currentUser == null)
      signInAnonymously(getAuth()).then((value:UserCredential)=>{
        return sendData(req, res)
      })
    else
      sendData(req, res)
  }
  catch (err) {
    res.status(500).json({error: err});
  }
}